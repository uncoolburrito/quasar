import * as THREE from 'three';

export class VisualizerScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Objects
        this.sun = null;
        this.mountain = null;
        this.ground = null;
    }

    init() {
        // 1. Setup Scene
        this.scene = new THREE.Scene();

        // Gradient Background via CSS (Simpler and smoother for 2D background)
        // Or Texture. Let's do a simple Texture for "dreamy" look.
        this.createGradientBackground();

        this.scene.fog = new THREE.FogExp2(0x1a0b2e, 0.02);

        // 2. Setup Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        this.camera.position.y = 2;

        // 3. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha for potential CSS bg
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        document.body.appendChild(this.renderer.domElement);

        // 4. Create World
        this.createSun();
        this.createMountain();
        this.createGround();

        // 5. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }

    createGradientBackground() {
        // Create a canvas to draw gradient
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 128; // Vertical gradient
        const context = canvas.getContext('2d');

        const gradient = context.createLinearGradient(0, 0, 0, 128);
        // Orange -> Pink -> Purple -> Dark Blue
        gradient.addColorStop(0, '#0a0a2a'); // Top (Dark Blue)
        gradient.addColorStop(0.3, '#2a0a3a'); // Purple
        gradient.addColorStop(0.6, '#aa4466'); // Pink
        gradient.addColorStop(1, '#ffaa33'); // Bottom (Orange)

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 128);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    createSun() {
        const geometry = new THREE.CircleGeometry(4, 64);
        // Emissive material for glow
        const material = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            side: THREE.DoubleSide,
        });

        this.sun = new THREE.Mesh(geometry, material);
        this.sun.position.z = -20;
        this.sun.position.y = 3;

        // Simple glow: just another bigger circle with low opacity
        const glowGeo = new THREE.CircleGeometry(6, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.z = -0.1; // Behind sun
        this.sun.add(glowMesh); // Child of sun so it moves with it

        this.scene.add(this.sun);
    }

    createMountain() {
        this.mountains = [];
        const layers = 3;

        for (let j = 0; j < layers; j++) {
            // Further back = wider and flatter
            // Fix: Increased base width from 100 to 400 to prevent side gaps
            const geometry = new THREE.PlaneGeometry(400 + j * 100, 40 + j * 20, 256, 4);
            const count = geometry.attributes.position.count;
            const positions = geometry.attributes.position;

            // Perlin-ish noise (simple manual sum of sines)
            for (let i = 0; i < count; i++) {
                if (positions.getY(i) > -5) {
                    const x = positions.getX(i);
                    // Different frequency per layer for variety
                    const freq = 0.2 - j * 0.05;
                    const amp = 8 - j * 2;

                    // Complex noise
                    const noise = Math.sin(x * freq) * amp
                        + Math.sin(x * freq * 2.5) * (amp / 2)
                        + Math.sin(x * freq * 5.1 + j) * (amp / 4);

                    // Peaks logic: absolute value to make them sharp, or standard wave
                    // Let's make them sharp peaks
                    positions.setY(i, positions.getY(i) + Math.max(0, noise));
                }
            }
            geometry.computeVertexNormals();

            // Darker colors for closer mountains (or fog will handle it if we used fog correctl, but let's force color depth)
            // Layer 0 (front): Dark
            // Layer 2 (back): Lighter (atmospheric)
            const lightness = 0.05 + j * 0.1;
            const color = new THREE.Color().setHSL(0.7, 0.4, lightness);

            const material = new THREE.MeshPhongMaterial({
                color: color,
                flatShading: true,
                shininess: 0
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = -30 - j * 20; // -30, -50, -70
            mesh.position.y = -5 + j * 2; // Rise up slightly in distance

            this.scene.add(mesh);
            this.mountains.push(mesh);
        }
    }

    createGround() {
        // Replaced "Ground" with "Dancing Bars" as requested.
        // Using InstancedMesh for performance.

        const countX = 40;
        const countZ = 40;
        this.groundGridSize = { x: countX, z: countZ };
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        // Move pivot to bottom so it scales up from ground
        boxGeo.translate(0, 0.5, 0);

        // Neon Material: Standard with Emissive
        const material = new THREE.MeshStandardMaterial({
            color: 0x110022,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0xaa2266,
            emissiveIntensity: 0.5
        });

        this.ground = new THREE.InstancedMesh(boxGeo, material, countX * countZ);
        this.ground.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();
        const spacing = 1.5;
        const offsetX = (countX * spacing) / 2;
        // const offsetZ = (countZ * spacing) / 2;

        let index = 0;
        for (let z = 0; z < countZ; z++) {
            for (let x = 0; x < countX; x++) {
                dummy.position.set(
                    x * spacing - offsetX,
                    -2, // Base height
                    -z * spacing // Extend into screen
                );
                dummy.updateMatrix();
                this.ground.setMatrixAt(index, dummy.matrix);
                index++;
            }
        }

        this.ground.position.z = 5; // Start closer to camera

        // Add point light for neon reflections
        const neonLight = new THREE.PointLight(0xff0088, 1, 50);
        neonLight.position.set(0, 10, -10);
        this.scene.add(neonLight);

        this.scene.add(this.ground);
    }

    update(audioData) {
        const time = performance.now() * 0.001;

        // Default values if no audio
        const bass = audioData ? audioData.bass : 0;
        const mid = audioData ? audioData.mid : 0;
        const high = audioData ? audioData.high : 0;

        // 1. Ground Bar Animation
        if (this.ground) {
            const dummy = new THREE.Object3D();
            const { x: countX, z: countZ } = this.groundGridSize;
            const spacing = 1.5;
            const offsetX = (countX * spacing) / 2;

            let index = 0;
            for (let z = 0; z < countZ; z++) {
                for (let x = 0; x < countX; x++) {
                    // Calculate wave effect
                    // Distance from center
                    const dx = x - countX / 2;
                    const dz = z; // distance from camera roughly

                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Wave logic
                    const wave = Math.sin(dist * 0.2 - time * 2) * 0.5 + 0.5;

                    // Combine wave with audio
                    // Bass affects overall height
                    // Mid affects wave peaks
                    let scaleY = 0.2 + wave * (0.5 + mid * 2);

                    // Noise/Randomness for "dancing" feel
                    const noise = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time);
                    scaleY += Math.abs(noise) * bass * 3;

                    dummy.position.set(
                        x * spacing - offsetX,
                        -2,
                        -z * spacing + 5 // static Z position (visual trick: move texture or wave offset instead of objects for infinite feel)
                    );

                    // To make it look like infinite scrolling, we can shift z based on time
                    // But for InstancedMesh, simpler to just animate the wave phase (done above).

                    dummy.scale.set(0.8, scaleY, 0.8);
                    dummy.updateMatrix();
                    this.ground.setMatrixAt(index, dummy.matrix);
                    index++;
                }
            }
            this.ground.instanceMatrix.needsUpdate = true;
            // Color reactivity: Change based on overall energy
            // (InstancedMesh color requires setColorAt, expensive in loop every frame?)
            // Simpler: just change global material color or rely on lighting.
            // Let's pulse the material color slightly.
            this.ground.material.color.setHSL(0.85 + bass * 0.1, 0.6, 0.3 + mid * 0.4);
        }

        // 2. Mountain Breathing (Keyed to Bass)
        if (this.mountains) {
            this.mountains.forEach((mesh, index) => {
                // Subtle stick to beat, less for background layers
                const scaleBase = 1 + bass * (0.1 / (index + 1));
                mesh.scale.set(1, scaleBase, 1);
            });
        }

        // 3. Sun Reactivity (Keyed to Highs)
        if (this.sun) {
            // Pulse/Bob
            this.sun.position.y = 3 + Math.sin(time) * 0.2 + high;

            // Scale with high freqs (shimmer)
            const sunScale = 1 + high * 0.5;
            this.sun.scale.set(sunScale, sunScale, 1);

            // Color shift warmer with intensity
            this.sun.material.color.setHSL(0.08 + high * 0.05, 1, 0.5 + high * 0.5);
        }

        this.renderer.render(this.scene, this.camera);
    }
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        // Mobile adjustment: move camera back if aspect ratio is narrow (portrait)
        if (this.camera.aspect < 1) {
            this.camera.position.z = 20; // Move back to see more
        } else {
            this.camera.position.z = 10; // Default
        }
    }
}
