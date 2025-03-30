import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
const FallingmodelsWithTextures: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0xF2DFC9, 0); 
        mountRef.current.appendChild(renderer.domElement);

       
        const light = new THREE.DirectionalLight(0xF2DFC9, 1);
        light.position.set(5, 5, 5).normalize();
        scene.add(light);

        
        const stlLoader = new STLLoader();

        const models: THREE.Mesh[] = [];
      
        const createModel = () => {
            const getRandomPosition = () => {
                const minDistance = 2; 
                let x: number, z: number;

                
                do {
                    x = (Math.random() - 0.5) * 20;
                    z = (Math.random() - 0.5) * 20; 
                } while (
                    models.some(
                        (model) =>
                            Math.abs(model.position.x - x) < minDistance &&
                            Math.abs(model.position.z - z) < minDistance
                    )
                );

                return { x, z };
            };
            stlLoader.load('/3dlogo.stl', (geometry) => {
                const material = new THREE.MeshPhongMaterial({ color: 0xF2DFC9, 
                    specular: 0xF2DFC9, shininess: 200 });
                const model = new THREE.Mesh(geometry, material);

                const { x, z } = getRandomPosition();
                model.position.set(x,10,z)

                const scale = 0.7;
                model.scale.set(scale, scale, scale);

                scene.add(model);
                models.push(model);
            });

            stlLoader.load('/3dtext.stl', (geometry) => {
                const material = new THREE.MeshPhongMaterial({
                    color: 0xF2DFC9,
                    specular: 0xF2DFC9, shininess: 200
                });
                const model = new THREE.Mesh(geometry, material);

                const { x, z } = getRandomPosition();
                model.position.set(x, 10, z)

                const scale = 1;
                model.scale.set(scale, scale, scale);

                scene.add(model);
                models.push(model);
            });
        };

        // Create Initial models
        createModel();
        createModel();
        // Position the Camera
        camera.position.z = 15;

        // Animation Variables
        const modelFallSpeed = 0.05;

        
        const animate = () => {
            requestAnimationFrame(animate);
            
            // Move models Down
            models.forEach((model, index) => {
                model.rotation.x += 0.01;
                model.rotation.y += 0.01;
                model.position.y -= modelFallSpeed;

                // Remove model When It Goes Below the Screen
                if (model.position.y < -10) {
                    scene.remove(model);
                    models.splice(index, 1);
                }
            });

            // Render the Scene
            renderer.render(scene, camera);
        };
        animate();

        // Spawn New models Every 2 Seconds
        const interval = setInterval(() => {
            if (models.length < 2) {
                createModel();
            }
        }, 2000);

        // Handle Window Resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            models.forEach((model) => model.geometry.dispose());
            models.forEach((model) => {
                model.material instanceof Array ? 
                model.material.forEach((material) => material.dispose()) : 
                model.material.dispose();
            });
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }}  className='min-h-screen lg:w-[50%] top-0 left-0'/>;
};

export default FallingmodelsWithTextures;