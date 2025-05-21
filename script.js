let polygons = [];
    let sounds = [];
    let isPlaying = false;
    let masterSpeed = 1.0;
    let masterVolume = 0.5;
    let startTime = 0;
    let elapsedTime = 0;
    let audioInitialized = false;
    let p5Instance = null;
    
    // Colors for each polygon (in HSB)
    const colors = [
      [0, 80, 90],    // Red (Triangle)
      [42, 80, 90],   // Orange (Square)
      [60, 80, 90],   // Yellow (Pentagon)
      [120, 80, 90],  // Green (Hexagon)
      [180, 80, 90],  // Cyan (Heptagon)
      [240, 80, 90],  // Blue (Octagon)
      [280, 80, 90]   // Purple (Nonagon)
    ];
    
    // Common rotation time for all polygons (in seconds)
    const rotationTime = 5; // All polygons complete one loop in 6 seconds
    
    // Set up audio permission button
    document.getElementById('enable-audio').addEventListener('click', function() {
      // Hide the overlay
      document.getElementById('audio-permission').style.display = 'none';
      
      // Initialize audio context
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        
        // Resume audio context if it's suspended
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        
        // Initialize p5 sketch after audio permission
        initializeP5Sketch();
      } else {
        console.error('Web Audio API is not supported in this browser');
        // Initialize p5 sketch anyway, even though audio might not work
        initializeP5Sketch();
      }
    });
    
    function initializeP5Sketch() {
      // Create a new p5 instance
      p5Instance = new p5(function(p) {
        p.preload = function() {
          // Preload sounds - we'll create them in setup instead
        };
        
        p.setup = function() {
          let canvas = p.createCanvas(800, 600);
          canvas.parent('canvas-container');
          p.colorMode(p.HSB, 360, 100, 100, 1);
          
          // Create oscillators for each polygon
          for (let i = 0; i < 7; i++) {
            let osc = new p5.Oscillator();
            
            // Create different timbres based on polygon
            if (i % 3 === 0) {
              osc.setType('sine');
            } else if (i % 3 === 1) {
              osc.setType('triangle');
            } else {
              osc.setType('sine');
            }
            
            // Set frequency based on pentatonic scale (B minor pentatonic)
        const frequencies = [116.54, 138.59, 155.56, 174.61, 207.65, 223, 277.18];

            osc.freq(frequencies[i]);
            
            osc.amp(0);
            osc.start();
            sounds.push(osc);
          }
          
         // Inside the initializeP5Sketch function, modify the polygon creation section:

          // Create polygons
          for (let i = 0; i < 7; i++) {
            const sides = i + 3; // 3 to 9 sides
            const radius = p.map(sides, 3, 9, 100, 220); // Size increases with sides

            // Get the initial state from the toggle button
            const toggleBtn = document.querySelector(`.toggle-btn[data-sides="${sides}"]`);
            const isActive = toggleBtn.classList.contains('active');

            // Calculate vertices once
            const vertices = [];
            for (let j = 0; j < sides; j++) {
              const angle = p.TWO_PI * j / sides - p.HALF_PI;
              vertices.push({
                x: radius * p.cos(angle),
                y: radius * p.sin(angle)
              });
            }

            const polygon = {
              sides: sides,
              radius: radius,
              vertices: vertices,
              color: colors[i],
              currentEdge: 0,
              edgeProgress: 0,
              speed: sides, // Multiply by sides - more sides = faster overall movement
              active: isActive, // Use the state from the toggle button
              lastVertex: 0,
              nextVertex: 1
            };
            polygons.push(polygon);
          }
          audioInitialized = true;
        };
        
        p.draw = function() {
          p.background(12);
          
          // Calculate global time position for perfect sync
          let currentTime = isPlaying ? (p.millis() - startTime) / 1000 : elapsedTime / 1000;
          let normalizedTime = (currentTime * masterSpeed) % rotationTime;
          let cyclePosition = normalizedTime / rotationTime; // 0 to 1 for a complete cycle
          
          // Draw all polygons
          p.push();
          p.translate(p.width / 2, p.height / 2);
          
          polygons.forEach((polygon, index) => {
            if (!polygon.active) return;
            
            const sides = polygon.sides;
            const vertices = polygon.vertices;
            const color = polygon.color;
            
            // Calculate position based on global time
            // Each polygon completes one full rotation in 'rotationTime' seconds
            // But travels through 'sides' number of edges in that time
            
            // Calculate which edge we're on (0 to sides-1)
            const totalProgress = cyclePosition * sides;
            const currentEdge = Math.floor(totalProgress) % sides;
            const edgeProgress = totalProgress % 1;
            
            // If we're at a new vertex and playing, trigger sound
            if (isPlaying && polygon.currentEdge !== currentEdge) {
              playSound(index);
            }
            
            // Update polygon state
            polygon.currentEdge = currentEdge;
            polygon.edgeProgress = edgeProgress;
            polygon.lastVertex = currentEdge;
            polygon.nextVertex = (currentEdge + 1) % sides;
            
            // Calculate current ball position along the edge
            const v1 = vertices[polygon.lastVertex];
            const v2 = vertices[polygon.nextVertex];
            const ballX = p.lerp(v1.x, v2.x, polygon.edgeProgress);
            const ballY = p.lerp(v1.y, v2.y, polygon.edgeProgress);
            
            // Draw polygon
            p.push();
            p.noFill();
            p.strokeWeight(2);
            p.stroke(color[0], color[1], color[2], 0.6);
            
            p.beginShape();
            for (let i = 0; i < sides; i++) {
              const v = vertices[i];
              p.vertex(v.x, v.y);
              
              // Draw vertices more prominently
              p.push();
              p.fill(color[0], color[1], color[2]);
              p.noStroke();
              p.circle(v.x, v.y, 10);
              p.pop();
            }
            p.endShape(p.CLOSE);
            
            // Draw ball
            p.fill(color[0], color[1], 100);
            p.noStroke();
            p.circle(ballX, ballY, 15);
            
            p.pop();
          });
          
          p.pop();
        };
      });
      
      // Set up UI controls
      document.getElementById('play-btn').addEventListener('click', function() {
        if (!isPlaying && audioInitialized) {
          startTime = p5Instance.millis() - elapsedTime;
          isPlaying = true;
        }
      });
      
      document.getElementById('stop-btn').addEventListener('click', function() {
        if (isPlaying) {
          elapsedTime = p5Instance.millis() - startTime;
          isPlaying = false;
        }
      });
      
      document.getElementById('reset-btn').addEventListener('click', function() {
        resetPositions();
        startTime = p5Instance.millis();
        elapsedTime = 0;
      });
      
      document.getElementById('master-speed').addEventListener('input', function() {
        masterSpeed = parseFloat(this.value);
        document.getElementById('master-speed-value').textContent = masterSpeed.toFixed(2) + '×';
      });
      
      document.getElementById('master-volume').addEventListener('input', function() {
        masterVolume = parseFloat(this.value);
        document.getElementById('master-volume-value').textContent = Math.round(masterVolume * 100) + '%';
      });
      
      // Set up toggle buttons
      const toggleButtons = document.querySelectorAll('.toggle-btn');
      toggleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const sides = parseInt(this.getAttribute('data-sides'));
          const index = sides - 3;
          polygons[index].active = !polygons[index].active;
          this.classList.toggle('active');
        });
      });
    }
    
    function resetPositions() {
      polygons.forEach(polygon => {
        polygon.currentEdge = 0;
        polygon.edgeProgress = 0;
        polygon.lastVertex = 0;
        polygon.nextVertex = 1;
      });
    }
    
    function playSound(index) {
      if (!isPlaying || !audioInitialized) return;
      
      // Play sound with short envelope
      const osc = sounds[index];
      osc.amp(masterVolume, 0.001);
      osc.amp(0, 0.1, 0.05);
    }