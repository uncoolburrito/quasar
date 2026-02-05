import * as THREE from 'three';

export class VisualizerScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Mode: 'landscape' or 'calm'
        this.mode = 'landscape';

        // Object Groups
        this.landscapeGroup = null;
        this.calmGroup = null;

        // Landscape Objects
        this.sun = null;
        this.mountain = null;
        this.ground = null;

        // Calm Objects
        this.water = null;
        this.hills = [];
        this.fireflies = null;

        // Animation State
        this.lastBeatTime = 0;
    }

    init() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        this.camera.position.y = 2; // Default for landscape

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        document.body.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Initialize Landscape Mode (Default)
        this.landscapeGroup = new THREE.Group();
        this.scene.add(this.landscapeGroup);

        this.createLandscapeBackground();
        this.createSun();
        this.createMountain();
        this.createGround();

        // Initialize Calm Mode (Hidden by default)
        this.calmGroup = new THREE.Group();
        this.calmGroup.visible = false;
        this.scene.add(this.calmGroup);

        this.createCalmWater();
        this.createCalmHills();
        this.createFireflies();

        // Set initial fog for landscape
        this.scene.fog = new THREE.FogExp2(0x1a0b2e, 0.02);
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;

        if (mode === 'landscape') {
            this.landscapeGroup.visible = true;
            this.calmGroup.visible = false;

            // Restore Landscape Camera & Fog
            this.camera.position.set(0, 2, 10);
            this.scene.fog = new THREE.FogExp2(0x1a0b2e, 0.02);
            this.createLandscapeBackground(); // Reset background
        } else if (mode === 'calm') {
            this.landscapeGroup.visible = false;
            this.calmGroup.visible = true;

            // Calm Mode Camera & Fog (Nature Theme)
            this.camera.position.set(0, 2, 12);
            this.camera.lookAt(0, 2, 0);
            this.scene.fog = new THREE.FogExp2(0x0b1026, 0.015);
            this.createCalmBackground();
        }
    }

    createLandscapeBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 128;
        const context = canvas.getContext('2d');

        const gradient = context.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(0.3, '#2a0a3a');
        gradient.addColorStop(0.6, '#aa4466');
        gradient.addColorStop(1, '#ffaa33');

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 128);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    createCalmBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 128;
        const context = canvas.getContext('2d');

        // Dusk / Night colors
        const gradient = context.createLinearGradient(0, 0, 0, 128);
        gradient.addColorStop(0, '#050714'); // Deep night
        gradient.addColorStop(0.4, '#0f173b'); // Dark Blue
        gradient.addColorStop(0.7, '#242b58'); // Twilight
        gradient.addColorStop(1, '#664455'); // Dusk tinge

        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 128);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    createSun() {
        const geometry = new THREE.CircleGeometry(4, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            side: THREE.DoubleSide,
        });

        this.sun = new THREE.Mesh(geometry, material);
        this.sun.position.z = -20;
        this.sun.position.y = 3;

        const glowGeo = new THREE.CircleGeometry(6, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.z = -0.1;
        this.sun.add(glowMesh);

        this.landscapeGroup.add(this.sun);
    }

    createMountain() {
        this.mountains = [];
        const layers = 3;

        for (let j = 0; j < layers; j++) {
            const geometry = new THREE.PlaneGeometry(400 + j * 100, 40 + j * 20, 256, 4);
            const count = geometry.attributes.position.count;
            const positions = geometry.attributes.position;

            for (let i = 0; i < count; i++) {
                if (positions.getY(i) > -5) {
                    const x = positions.getX(i);
                    const freq = 0.2 - j * 0.05;
                    const amp = 8 - j * 2;

                    const noise = Math.sin(x * freq) * amp
                        + Math.sin(x * freq * 2.5) * (amp / 2)
                        + Math.sin(x * freq * 5.1 + j) * (amp / 4);

                    positions.setY(i, positions.getY(i) + Math.max(0, noise));
                }
            }
            geometry.computeVertexNormals();

            const lightness = 0.05 + j * 0.1;
            const color = new THREE.Color().setHSL(0.7, 0.4, lightness);

            const material = new THREE.MeshPhongMaterial({
                color: color,
                flatShading: true,
                shininess: 0
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = -30 - j * 20;
            mesh.position.y = -5 + j * 2;

            this.landscapeGroup.add(mesh);
            this.mountains.push(mesh);
        }
    }

    createGround() {
        const countX = 40;
        const countZ = 40;
        this.groundGridSize = { x: countX, z: countZ };
        const boxGeo = new THREE.BoxGeometry(1, 1, 1);

        boxGeo.translate(0, 0.5, 0);

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

        let index = 0;
        for (let z = 0; z < countZ; z++) {
            for (let x = 0; x < countX; x++) {
                dummy.position.set(
                    x * spacing - offsetX,
                    -2,
                    -z * spacing
                );
                dummy.updateMatrix();
                this.ground.setMatrixAt(index, dummy.matrix);
                index++;
            }
        }

        this.ground.position.z = 5;

        const neonLight = new THREE.PointLight(0xff0088, 1, 50);
        neonLight.position.set(0, 10, -10);
        this.landscapeGroup.add(neonLight);

        this.landscapeGroup.add(this.ground);
    }

    createCalmWater() {
        const geometry = new THREE.PlaneGeometry(100, 100, 64, 64);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color: 0x1a2b4a,
            roughness: 0.1,
            metalness: 0.8,
            flatShading: true,
            transparent: true,
            opacity: 0.8
        });

        this.water = new THREE.Mesh(geometry, material);
        this.water.position.y = -2;
        this.water.position.z = -10;

        // Save initial positions for wave calculation
        this.water.userData = {
            basePositions: arrayClone(geometry.attributes.position.array)
        };

        this.calmGroup.add(this.water);

        // Add a Moon
        const moonGeo = new THREE.CircleGeometry(3, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, fog: false });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.moon.position.set(10, 8, -25);
        this.calmGroup.add(this.moon);

        // Moon Glow
        const glowGeo = new THREE.CircleGeometry(5, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffee, transparent: true, opacity: 0.1, fog: false });
        const moonGlow = new THREE.Mesh(glowGeo, glowMat);
        moonGlow.position.z = -0.1;
        this.moon.add(moonGlow);
    }

    createCalmHills() {
        this.hills = [];
        const colors = [0x0a0f24, 0x111633, 0x1a224a]; // Dark silhouette colors

        for (let i = 0; i < 3; i++) {
            const geometry = new THREE.PlaneGeometry(100, 20, 128, 1);
            const positions = geometry.attributes.position;

            // Create jagged hill shape
            for (let k = 0; k < positions.count; k++) {
                const x = positions.getX(k);
                const noise = Math.sin(x * (0.05 + i * 0.02) + i) * (3 + i)
                    + Math.sin(x * 0.2) * 1;

                if (positions.getY(k) > 0) {
                    positions.setY(k, noise + (i * 2));
                }
            }

            const material = new THREE.MeshBasicMaterial({
                color: colors[i],
                transparent: true,
                opacity: 0.9
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.z = -20 - (i * 10);
            mesh.position.y = 0;

            this.hills.push(mesh);
            this.calmGroup.add(mesh);
        }
    }

    createFireflies() {
        const geometry = new THREE.BufferGeometry();
        const count = 100;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 40; // x
            positions[i * 3 + 1] = Math.random() * 10;      // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
            sizes[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffaa,
            size: 0.2,
            transparent: true,
            opacity: 0.8,
            map: createCircleTexture()
        });

        this.fireflies = new THREE.Points(geometry, material);
        this.calmGroup.add(this.fireflies);
    }

    update(audioData) {
        if (this.mode === 'landscape') {
            this.updateLandscape(audioData);
        } else {
            this.updateCalm(audioData);
        }
    }

    updateLandscape(audioData) {
        const time = performance.now() * 0.001;
        const bass = audioData ? audioData.bass : 0;
        const mid = audioData ? audioData.mid : 0;
        const high = audioData ? audioData.high : 0;

        if (this.ground) {
            const dummy = new THREE.Object3D();
            const { x: countX, z: countZ } = this.groundGridSize;
            const spacing = 1.5;
            const offsetX = (countX * spacing) / 2;

            let index = 0;
            for (let z = 0; z < countZ; z++) {
                for (let x = 0; x < countX; x++) {
                    const dx = x - countX / 2;
                    const dz = z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const wave = Math.sin(dist * 0.2 - time * 2) * 0.5 + 0.5;
                    let scaleY = 0.2 + wave * (0.5 + mid * 2);
                    const noise = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time);
                    scaleY += Math.abs(noise) * bass * 3;

                    dummy.position.set(
                        x * spacing - offsetX,
                        -2,
                        -z * spacing + 5
                    );
                    dummy.scale.set(0.8, scaleY, 0.8);
                    dummy.updateMatrix();
                    this.ground.setMatrixAt(index, dummy.matrix);
                    index++;
                }
            }
            this.ground.instanceMatrix.needsUpdate = true;
            this.ground.material.color.setHSL(0.85 + bass * 0.1, 0.6, 0.3 + mid * 0.4);
        }

        if (this.mountains) {
            this.mountains.forEach((mesh, index) => {
                const scaleBase = 1 + bass * (0.1 / (index + 1));
                mesh.scale.set(1, scaleBase, 1);
            });
        }

        if (this.sun) {
            this.sun.position.y = 3 + Math.sin(time) * 0.2 + high;
            const sunScale = 1 + high * 0.5;
            this.sun.scale.set(sunScale, sunScale, 1);
            this.sun.material.color.setHSL(0.08 + high * 0.05, 1, 0.5 + high * 0.5);
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateCalm(audioData) {
        const time = performance.now() * 0.0005; // Slower time

        // Smooth audio data heavily for this mode
        const bass = audioData ? audioData.bass : 0;
        const mid = audioData ? audioData.mid : 0;
        const high = audioData ? audioData.high : 0;

        // 1. Water Waves (Bass)
        if (this.water && this.water.userData.basePositions) {
            const positions = this.water.geometry.attributes.position;
            const base = this.water.userData.basePositions;

            for (let i = 0; i < positions.count; i++) {
                const x = base[i * 3];
                const y = base[i * 3 + 1]; // Actually Z in 2D plane logic before rotation

                // Gentle rolling wave
                const wave1 = Math.sin(x * 0.2 + time) * 0.5;
                const wave2 = Math.cos(y * 0.2 + time * 0.8) * 0.5;

                // Bass adds swell height
                const swell = (Math.sin(x * 0.5 + time * 2) + Math.cos(y * 0.5 + time * 2)) * (bass * 2);

                positions.setZ(i, wave1 + wave2 + swell); // Modifying Z because plane is rotated
            }
            positions.needsUpdate = true;
        }

        // 2. Hills Parallax (Mid)
        this.hills.forEach((hill, i) => {
            // Subtle drift
            hill.position.x = Math.sin(time * 0.1 + i) * (0.5 + mid);
        });

        // 3. Fireflies (High)
        if (this.fireflies) {
            const positions = this.fireflies.geometry.attributes.position;

            for (let i = 0; i < positions.count; i++) {
                // Slow drift upward
                positions.setY(i, positions.getY(i) + 0.02 + (high * 0.1));

                // Reset if too high
                if (positions.getY(i) > 10) {
                    positions.setY(i, 0);
                    positions.setX(i, (Math.random() - 0.5) * 40);
                    positions.setZ(i, (Math.random() - 0.5) * 40);
                }
            }
            positions.needsUpdate = true;

            // Sparkle opacity
            this.fireflies.material.opacity = 0.5 + (high * 0.5);
        }

        // 4. Moon Pulse (Bass)
        if (this.moon) {
            const scale = 1 + (bass * 0.05);
            this.moon.scale.set(scale, scale, 1);
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        if (this.camera.aspect < 1) {
            this.camera.position.z = 20;
        } else {
            this.camera.position.z = this.mode === 'calm' ? 12 : 10;
        }
    }
}

// Helpers
function arrayClone(arr) {
    return new Float32Array(arr);
}

function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}
