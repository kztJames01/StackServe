use std::{path::PathBuf, process::Stdio, time::Duration};

use anyhow::{Context, Result, bail};
use stackfit_core::protocol::{MAX_LINE_BYTES, WorkerRequest, WorkerResponse};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::{Child, ChildStdin, ChildStdout, Command},
    sync::Mutex,
    time::timeout,
};

struct Process {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

pub struct Worker {
    python: PathBuf,
    directory: PathBuf,
    process: Mutex<Option<Process>>,
    startup_timeout: Duration,
    warm_timeout: Duration,
}

impl Worker {
    pub fn new(python: PathBuf, directory: PathBuf) -> Self {
        Self {
            python,
            directory,
            process: Mutex::new(None),
            startup_timeout: Duration::from_secs(60),
            warm_timeout: Duration::from_secs(10),
        }
    }

    pub fn with_timeouts(mut self, startup: Duration, warm: Duration) -> Self {
        self.startup_timeout = startup;
        self.warm_timeout = warm;
        self
    }

    pub async fn search(&self, request: &WorkerRequest) -> Result<WorkerResponse> {
        request.validate()?;
        let mut guard = self.process.lock().await;
        let cold = guard.is_none();
        let mut process = if let Some(process) = guard.take() {
            process
        } else {
            let mut child = Command::new(&self.python)
                .arg("-m")
                .arg("stackfit_rag.worker")
                .current_dir(&self.directory)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .kill_on_drop(true)
                .spawn()
                .context("starting Python worker")?;
            let stdin = child.stdin.take().context("worker stdin unavailable")?;
            let stdout = child.stdout.take().context("worker stdout unavailable")?;
            Process {
                child,
                stdin,
                stdout: BufReader::new(stdout),
            }
        };
        let duration = if cold {
            self.startup_timeout
        } else {
            self.warm_timeout
        };
        let result = timeout(duration, exchange(&mut process, request)).await;
        match result {
            Ok(Ok(response)) => {
                *guard = Some(process);
                Ok(response)
            }
            Ok(Err(error)) => Err(error),
            Err(_) => bail!("worker timed out"),
        }
    }
}

async fn exchange(process: &mut Process, request: &WorkerRequest) -> Result<WorkerResponse> {
    if process.child.try_wait()?.is_some() {
        bail!("worker exited")
    }
    let mut line = serde_json::to_vec(request)?;
    line.push(b'\n');
    process.stdin.write_all(&line).await?;
    process.stdin.flush().await?;
    let mut output = Vec::new();
    loop {
        let available = process.stdout.fill_buf().await?;
        if available.is_empty() {
            bail!("worker response missing")
        }
        let count = available
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or(available.len(), |i| i + 1);
        if output.len() + count > MAX_LINE_BYTES {
            bail!("worker response too large")
        }
        let done = available[count - 1] == b'\n';
        output.extend_from_slice(&available[..count]);
        process.stdout.consume(count);
        if done {
            break;
        }
    }
    let response: WorkerResponse = serde_json::from_slice(&output)?;
    response.validate_for(request)?;
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use stackfit_core::protocol::{CORPUS_VERSION, Filters, SCHEMA_VERSION};

    #[cfg(unix)]
    fn hang_script(suffix: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;

        let script = std::env::temp_dir().join(format!("stackfit-{suffix}-{}", std::process::id()));
        std::fs::write(&script, "#!/bin/sh\nexec sleep 30\n").unwrap();
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o700)).unwrap();
        script
    }

    fn request() -> WorkerRequest {
        WorkerRequest {
            schema_version: SCHEMA_VERSION,
            request_id: "test".to_owned(),
            operation: "search".to_owned(),
            query: "test".to_owned(),
            filters: Filters::default(),
            limit: 1,
            corpus_version: CORPUS_VERSION.to_owned(),
        }
    }

    #[test]
    fn timeouts_are_configurable() {
        let worker = Worker::new(PathBuf::from("python"), PathBuf::from("/tmp"))
            .with_timeouts(Duration::from_secs(1), Duration::from_secs(2));
        assert_eq!(worker.startup_timeout, Duration::from_secs(1));
        assert_eq!(worker.warm_timeout, Duration::from_secs(2));
    }

    #[tokio::test]
    async fn crashed_worker_returns_error() {
        let worker = Worker::new(PathBuf::from("/bin/false"), PathBuf::from("/tmp"));
        assert!(worker.search(&request()).await.is_err());
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn hung_worker_times_out() {
        let script = hang_script("timeout");
        let mut worker = Worker::new(script.clone(), std::env::temp_dir());
        worker.startup_timeout = Duration::from_millis(100);
        let error = worker.search(&request()).await.unwrap_err();
        assert!(error.to_string().contains("timed out"));
        std::fs::remove_file(script).unwrap();
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn cancellation_discards_worker() {
        let script = hang_script("cancel");
        let worker = std::sync::Arc::new(Worker::new(script.clone(), std::env::temp_dir()));
        let task_worker = worker.clone();
        let task = tokio::spawn(async move { task_worker.search(&request()).await });
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert!(!task.is_finished());
        task.abort();
        let _ = task.await;
        assert!(worker.process.lock().await.is_none());
        std::fs::remove_file(script).unwrap();
    }
}
