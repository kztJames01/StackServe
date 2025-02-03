'use client'

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeDBackground = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Scene, Camera, Renderer
        if(!mountRef.current) return
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0); // Transparent background
        mountRef.current.appendChild(renderer.domElement);

        // Geometry and Material
        const geometry = new THREE.BoxGeometry(2,2,2);
        const material = new THREE.MeshBasicMaterial({ color: 0x2E0B05, wireframe: true });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        // Position the Camera
        camera.position.z = 5;

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        };
        animate();

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
            window.removeEventListener('resize', handleResize);
            if(mountRef.current) mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} style={{ position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, zIndex: -1 }} />;
};

export default ThreeDBackground;