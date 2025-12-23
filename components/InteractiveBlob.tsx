import React, { useEffect, useRef } from 'react';

interface InteractiveBlobProps {
  size?: number;
  color?: string;
  className?: string;
}

export const InteractiveBlob: React.FC<InteractiveBlobProps> = ({ 
  size = 40, 
  color = '#4485d1',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    class Blob {
      points: Point[] = [];
      _color: string = color;
      _canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      _points: number = 32;
      _radius: number = size / 3;
      _position = { x: 0.5, y: 0.5 };

      constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
      }

      get color() { return this._color; }
      get canvas() { return this._canvas; }
      get numPoints() { return this._points; }
      get radius() { return this._radius; }
      get position() { return this._position; }
      get divisional() { return Math.PI * 2 / this.numPoints; }
      get center() { 
        return { 
          x: this.canvas.width * this.position.x, 
          y: this.canvas.height * this.position.y 
        }; 
      }

      init() {
        for (let i = 0; i < this.numPoints; i++) {
          this.points.push(new Point(this.divisional * (i + 1), this));
        }
      }

      render() {
        const ctx = this.ctx;
        const pointsArray = this.points;
        const points = this.numPoints;
        const center = this.center;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(center.x, center.y, this.canvas.width / 2, 0, Math.PI * 2);
        ctx.clip();
        
        pointsArray[0].solveWith(pointsArray[points - 1], pointsArray[1]);

        let p0 = pointsArray[points - 1].position;
        let p1 = pointsArray[0].position;
        let _p2 = p1;

        ctx.beginPath();
        ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);

        for (let i = 1; i < points; i++) {
          pointsArray[i].solveWith(pointsArray[i - 1], pointsArray[i + 1] || pointsArray[0]);
          let p2 = pointsArray[i].position;
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          p1 = p2;
        }

        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + _p2.x) / 2, (p1.y + _p2.y) / 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
        
        animationRef.current = requestAnimationFrame(() => this.render());
      }
    }

    class Point {
      parent: Blob;
      azimuth: number;
      _components: { x: number; y: number };
      _acceleration: number = 0;
      _speed: number = 0;
      _radialEffect: number = 0;
      _elasticity: number = 0.0008;
      _friction: number = 0.012;

      constructor(azimuth: number, parent: Blob) {
        this.parent = parent;
        this.azimuth = Math.PI - azimuth;
        this._components = { x: Math.cos(this.azimuth), y: Math.sin(this.azimuth) };
        this.acceleration = -0.3 + Math.random() * 0.6;
      }

      solveWith(leftPoint: Point, rightPoint: Point) {
        this.acceleration = (-0.3 * this.radialEffect + 
          (leftPoint.radialEffect - this.radialEffect) + 
          (rightPoint.radialEffect - this.radialEffect)) * this.elasticity - 
          this.speed * this.friction;
      }

      set acceleration(value: number) {
        this._acceleration = value;
        this.speed += this._acceleration * 2;
      }

      get acceleration() { return this._acceleration; }
      set speed(value: number) {
        this._speed = value;
        this.radialEffect += this._speed * 5;
      }
      get speed() { return this._speed; }
      set radialEffect(value: number) { this._radialEffect = value; }
      get radialEffect() { return this._radialEffect; }
      get position() {
        return {
          x: this.parent.center.x + this._components.x * (this.parent.radius + this.radialEffect),
          y: this.parent.center.y + this._components.y * (this.parent.radius + this.radialEffect)
        };
      }
      get elasticity() { return this._elasticity; }
      get friction() { return this._friction; }
    }

    canvas.width = size;
    canvas.height = size;
    const blob = new Blob(canvas);
    blob.init();
    blob.render();

    let oldMousePoint = { x: 0, y: 0 };
    let hover = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const pos = blob.center;
      const diff = { x: clientX - pos.x, y: clientY - pos.y };
      const dist = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
      let angle: number | null = null;

      if (dist < blob.radius && !hover) {
        angle = Math.atan2(clientY - pos.y, clientX - pos.x);
        hover = true;
      } else if (dist > blob.radius && hover) {
        angle = Math.atan2(clientY - pos.y, clientX - pos.x);
        hover = false;
      }

      if (typeof angle === 'number') {
        let nearestPoint: Point | null = null;
        let distanceFromPoint = 100;
        blob.points.forEach(point => {
          if (Math.abs(angle! - point.azimuth) < distanceFromPoint) {
            nearestPoint = point;
            distanceFromPoint = Math.abs(angle! - point.azimuth);
          }
        });
        if (nearestPoint) {
          const strength = { x: oldMousePoint.x - clientX, y: oldMousePoint.y - clientY };
          let strengthMagnitude = Math.sqrt(strength.x * strength.x + strength.y * strength.y) * 6;
          if (strengthMagnitude > 60) strengthMagnitude = 60;
          nearestPoint.acceleration = strengthMagnitude / 100 * (hover ? -1 : 1);
        }
      }
      oldMousePoint = { x: clientX, y: clientY };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [size, color]);

  return <canvas ref={canvasRef} className={className} style={{ width: size, height: size, display: 'block', borderRadius: '50%' }} />;
};
