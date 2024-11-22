class Piece {
    static loader = null;
    static redModel = null;
    static blackModel = null;
    static crownModel = null;
    static useCSS = false;

    constructor(color, x, y) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.isKing = false;
        this.element = null;
        this.mesh = null;
    }

    static async loadModels() {
        if (Piece.useCSS) return false;

        try {
            if (!Piece.loader) {
                Piece.loader = new THREE.STLLoader();
            }

            // Load STL files
            Piece.redModel = await Piece.loader.loadAsync('models/checker_piece.stl');
            Piece.blackModel = await Piece.loader.loadAsync('models/checker_piece.stl');
            Piece.crownModel = await Piece.loader.loadAsync('models/crown.stl');
            
            // Set up materials
            const redMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xff1744,
                shininess: 100,
                specular: 0x444444
            });
            const blackMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x1a1a1a,
                shininess: 100,
                specular: 0x444444
            });

            // Apply materials to geometries
            Piece.redModel.material = redMaterial;
            Piece.blackModel.material = blackMaterial;
            
            return true;
        } catch (error) {
            console.warn('Failed to load 3D models, falling back to CSS pieces:', error);
            Piece.useCSS = true;
            return false;
        }
    }

    createDOMElement() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = `piece ${this.color}`;

            if (Piece.useCSS) {
                if (this.isKing) {
                    this.element.classList.add('king');
                }
                return this.element;
            }

            try {
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ alpha: true });
                renderer.setSize(60, 60);

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(1, 1, 2);
                scene.add(ambientLight);
                scene.add(directionalLight);

                const geometry = this.color === 'red' ? Piece.redModel : Piece.blackModel;
                this.mesh = new THREE.Mesh(geometry, geometry.material);
                scene.add(this.mesh);

                camera.position.z = 5;
                this.element.appendChild(renderer.domElement);

                const animate = () => {
                    requestAnimationFrame(animate);
                    renderer.render(scene, camera);
                };
                animate();

                if (this.isKing) {
                    this.addCrown(scene);
                }
            } catch (error) {
                console.warn('Failed to create 3D piece, falling back to CSS:', error);
                Piece.useCSS = true;
                this.element.className = `piece ${this.color}`;
                if (this.isKing) {
                    this.element.classList.add('king');
                }
            }
        }
        return this.element;
    }

    makeKing() {
        this.isKing = true;
        if (!this.element) return;

        if (Piece.useCSS) {
            this.element.classList.add('king');
            return;
        }

        try {
            if (Piece.crownModel && this.mesh) {
                this.addCrown(this.mesh.parent);
            }
        } catch (error) {
            console.warn('Failed to add 3D crown, falling back to CSS king:', error);
            this.element.classList.add('king');
        }
    }

    addCrown(scene) {
        if (!Piece.useCSS && Piece.crownModel) {
            const crownMesh = new THREE.Mesh(
                Piece.crownModel,
                new THREE.MeshPhongMaterial({ 
                    color: 0xffd700,
                    shininess: 100,
                    specular: 0xffffaa
                })
            );
            crownMesh.position.y = 1;
            crownMesh.scale.set(0.5, 0.5, 0.5);
            scene.add(crownMesh);
        }
    }

    canMove(board, newX, newY) {
        // Implementation of movement rules
        const dx = newX - this.x;
        const dy = newY - this.y;
        
        if (!this.isKing) {
            if (this.color === 'red' && dy >= 0) return false;
            if (this.color === 'black' && dy <= 0) return false;
        }

        return Math.abs(dx) === 1 && Math.abs(dy) === 1;
    }

    canJump(board, newX, newY) {
        // Implementation of jumping rules
        const dx = newX - this.x;
        const dy = newY - this.y;
        
        if (!this.isKing) {
            if (this.color === 'red' && dy >= 0) return false;
            if (this.color === 'black' && dy <= 0) return false;
        }

        if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) return false;

        const jumpedX = this.x + dx/2;
        const jumpedY = this.y + dy/2;
        const jumpedPiece = board.getPiece(jumpedX, jumpedY);

        return jumpedPiece && jumpedPiece.color !== this.color;
    }
} 