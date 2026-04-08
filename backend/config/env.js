import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV ||  'dev'}.local` });

export const { PORT,NODE_ENV, MONGODB_URI,JWT_SECRET,JWT_EXPIRE_TIME, ARC_JET_KEY, ARC_JET_ENV, QSTASH_URL, QSTASH_TOKEN, SERVER_URL, ACCOUNT_EMAIL, EMAIL_PASSWORD } = process.env;

