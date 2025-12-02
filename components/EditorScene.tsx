
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  Environment, 
  ContactShadows,
  Edges,
  GizmoHelper,
  GizmoViewport,
  OrthographicCamera,
  PerspectiveCamera,
  Line,
  Html,
  Text,
  useGLTF
} from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { useStore } from '../store';
import { ShapeData } from '../types';
import { getSunPosition } from '../utils/solar';

// --- CAMERA HANDLER ---
const CameraHandler: React.FC = () => {
  const { cameraRequest } = useStore();
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!cameraRequest) return;
    
    const dist = 50; 
    const isoDist = 30;

    // Reset rotation to ensure proper alignment for ortho views
    camera.rotation.set(0,0,0);

    switch (cameraRequest.type) {
      case 'iso':
        camera.position.set(isoDist, isoDist, isoDist);
        break;
      case 'axo':
        camera.position.set(-isoDist, isoDist, isoDist);
        break;
      case 'top':
        camera.position.set(0, dist, 0);
        break;
      case 'bottom':
        camera.position.set(0, -dist, 0);
        break;
      case 'front':
        camera.position.set(0, 0, dist);
        break;
      case 'back':
        camera.position.set(0, 0, -dist);
        break;
      case 'left':
        camera.position.set(-dist, 0, 0);
        break;
      case 'right':
        camera.position.set(dist, 0, 0);
        break;
    }
    
    camera.lookAt(0,0,0);
    
    if (controls) {
       const orb = controls as any;
       orb.target.set(0, 0, 0);
       orb.update();
    }
  }, [cameraRequest, camera, controls]);

  return null;
};

// --- SUN COMPONENT ---
const SunPathDiagram: React.FC = () => {
  const { sunSettings } = useStore();
  const radius = sunSettings.radius; 

  const utcHour = useMemo(() => {
     const offset = Math.round(sunSettings.longitude / 15);
     return sunSettings.time - offset;
  }, [sunSettings.time, sunSettings.longitude]);

  const sunPos = useMemo(() => {
    return getSunPosition(sunSettings.latitude, sunSettings.longitude, sunSettings.date, utcHour);
  }, [sunSettings.latitude, sunSettings.longitude, sunSettings.date, utcHour]);
  
  const { x, y, z } = sunPos;

  const pathPoints = useMemo(() => {
    if (!sunSettings.enabled) return [];
    const pts = [];
    const offset = Math.round(sunSettings.longitude / 15);
    for (let h = 0; h <= 24; h += 0.25) {
      const u = h - offset; 
      const pos = getSunPosition(sunSettings.latitude, sunSettings.longitude, sunSettings.date, u);
      if (pos.altitude > -0.05) {
        pts.push(new THREE.Vector3(pos.x * radius, pos.y * radius, pos.z * radius));
      }
    }
    return pts;
  }, [sunSettings.latitude, sunSettings.longitude, sunSettings.date, sunSettings.enabled, radius]);

  if (!sunSettings.enabled) return null;

  return (
    <group>
      <directionalLight 
        position={[x * 40, y * 40, z * 40]} 
        intensity={2.5} 
        color={sunSettings.sunColor}
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-100, 100, 100, -100]} near={0.1} far={500} />
      </directionalLight>

      <ambientLight intensity={0.4} />

      {sunSettings.showPath && (
        <>
          <group position={[0, 0.02, 0]}>
            <Text position={[0, 0, -radius - 2]} fontSize={radius/10} color="#94a3b8" rotation={[-Math.PI/2, 0, 0]}>N</Text>
            <mesh rotation={[-Math.PI/2, 0, 0]}>
              <ringGeometry args={[radius, radius + 0.1, 64]} />
              <meshBasicMaterial color="#cbd5e1" opacity={0.5} transparent />
            </mesh>
          </group>
          {pathPoints.length > 0 && <Line points={pathPoints} color={sunSettings.pathColor} lineWidth={3} />}
          <mesh position={[x * radius, y * radius, z * radius]}>
            <sphereGeometry args={[radius * 0.04, 16, 16]} />
            <meshBasicMaterial color={sunSettings.sunColor} />
          </mesh>
        </>
      )}
    </group>
  );
};

// --- SHAPE COMPONENTS ---
const CustomShapeMesh: React.FC<{ points: [number, number, number][], data: ShapeData }> = ({ points, data }) => {
    if (!points || points.length < 3) return null;
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        if (points && points.length > 0) {
            s.moveTo(points[0][0], points[0][2]);
            for (let i = 1; i < points.length; i++) {
                s.lineTo(points[i][0], points[i][2]);
            }
            s.closePath();
        }
        return s;
    }, [points]);
    const extrudeSettings = useMemo(() => ({ depth: -Math.max(0.01, data.extrudeDepth || 0), bevelEnabled: false }), [data.extrudeDepth]);
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} castShadow receiveShadow>
            {(data.extrudeDepth || 0) <= 0.01 ? <shapeGeometry args={[shape]} /> : <extrudeGeometry args={[shape, extrudeSettings]} />}
            <meshStandardMaterial color={data.color} transparent opacity={data.opacity} wireframe={data.wireframe} side={THREE.DoubleSide} />
            {data.edges && <Edges threshold={15} color={data.edgeColor} />}
        </mesh>
    );
};

const TreeMesh: React.FC<{ data: ShapeData }> = ({ data }) => (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshStandardMaterial color={data.secondaryColor || '#5d4037'} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={data.color} transparent opacity={data.opacity} wireframe={data.wireframe} />
        {data.edges && <Edges threshold={20} color={data.edgeColor} />}
      </mesh>
    </group>
);

const ImageMesh: React.FC<{ data: ShapeData }> = ({ data }) => {
  const texture = useLoader(THREE.TextureLoader, data.imageUrl || '');
  return (
    <mesh position={[0,0,0]} castShadow receiveShadow>
      <planeGeometry args={[1 * (data.aspectRatio || 1), 1]} />
      <meshBasicMaterial map={texture} transparent opacity={data.opacity} side={THREE.DoubleSide} toneMapped={false} />
      {data.edges && <Edges threshold={15} color={data.edgeColor} />}
    </mesh>
  );
};

const ModelMesh: React.FC<{ data: ShapeData }> = ({ data }) => {
  const { scene, nodes } = useGLTF(data.modelUrl || '', true);
  const clone = useMemo(() => {
    if (data.modelNodeName && nodes[data.modelNodeName]) {
       const node = nodes[data.modelNodeName];
       const c = node.clone(false);
       c.position.set(0,0,0); c.rotation.set(0,0,0); c.scale.set(1,1,1);
       c.castShadow = true; c.receiveShadow = true;
       if ((c as THREE.Mesh).isMesh) { const mat = (c as THREE.Mesh).material; if (mat) (mat as THREE.Material).side = THREE.DoubleSide; }
       return c;
    }
    const clonedScene = scene.clone(true);
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true; child.receiveShadow = true;
        const mat = (child as THREE.Mesh).material; if (mat) (mat as THREE.Material).side = THREE.DoubleSide; 
      }
    });
    return clonedScene;
  }, [scene, nodes, data.modelNodeName]);
  return <primitive object={clone} castShadow receiveShadow />;
};

// --- RECURSIVE SHAPE MESH ---
const ShapeMesh: React.FC<{ data: ShapeData }> = ({ data }) => {
  const { selectShape, transformMode, updateShape, setTransformMode, setIsDragging, snapshot, shapes } = useStore();
  const userData = useMemo(() => ({ isArchMass: true, shapeData: data }), [data]);
  
  // Find children for grouping
  const children = shapes.filter(s => s.parentId === data.id);

  const handlePointerDown = (e: any) => {
    if (!data.visible || data.locked) return;
    
    // Support Multi-selection with Ctrl/Shift
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    
    if (transformMode === 'pushpull') {
      e.stopPropagation();
      selectShape(data.id, false); // PushPull only works on single item
      snapshot();
      setIsDragging(true); 
    } else {
      e.stopPropagation();
      selectShape(data.id, isMulti);
    }
  };

  const commonProps = {
      name: data.name,
      userData: userData,
      position: data.position,
      rotation: data.rotation,
      scale: data.scale,
      visible: data.visible,
      onClick: handlePointerDown,
  };

  if (data.type === 'group') {
      return (
          <group {...commonProps}>
              {children.map(child => <ShapeMesh key={child.id} data={child} />)}
          </group>
      );
  }

  // --- Render Leaf Nodes ---
  return (
      <group {...commonProps}>
          {data.type === 'tree' && <TreeMesh data={data} />}
          {data.type === 'image' && <ImageMesh data={data} />}
          {data.type === 'model' && <ModelMesh data={data} />}
          {data.type === 'custom' && data.points && <CustomShapeMesh points={data.points} data={data} />}
          
          {['box','sphere','cylinder','cone','plane'].includes(data.type) && (
              <mesh castShadow={data.type !== 'plane'} receiveShadow>
                  {data.type === 'box' && <boxGeometry args={[1, 1, 1]} />}
                  {data.type === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
                  {data.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
                  {data.type === 'cone' && <coneGeometry args={[0.5, 1, 32]} />}
                  {data.type === 'plane' && <planeGeometry args={[1, 1]} />}
                  <meshStandardMaterial color={data.color} transparent opacity={data.opacity} wireframe={data.wireframe} side={THREE.DoubleSide} />
                  {data.edges && <Edges threshold={15} color={data.edgeColor} />}
              </mesh>
          )}
      </group>
  );
};

// --- DRAWING PLANE ---
const DrawingPlane = () => {
    const { isDrawing, addDrawingPoint, drawingPoints, finishDrawing, snapEnabled, snapGrid } = useStore();
    const [mousePos, setMousePos] = useState<[number, number, number] | null>(null);
    
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isDrawing) return;
        if (e.key === 'Enter') finishDrawing();
        if (e.key === 'Escape') useStore.getState().cancelDrawing();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawing, finishDrawing]);

    if (!isDrawing) return null;

    const handlePointerMove = (e: any) => {
        let { x, y, z } = e.point;
        if (snapEnabled) { x = Math.round(x / snapGrid) * snapGrid; z = Math.round(z / snapGrid) * snapGrid; }
        setMousePos([x, 0.05, z]);
    };
    const handleClick = (e: any) => {
        e.stopPropagation();
        let { x, z } = e.point;
        if (snapEnabled) { x = Math.round(x / snapGrid) * snapGrid; z = Math.round(z / snapGrid) * snapGrid; }
        addDrawingPoint([x, 0, z]);
    };
    const linePoints = [...drawingPoints];
    if (mousePos) linePoints.push(mousePos);

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial visible={false} />
            </mesh>
            {linePoints.length > 0 && <Line points={linePoints} color="#2563eb" lineWidth={2} />}
            {drawingPoints.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.08]} /><meshBasicMaterial color="#2563eb" /></mesh>)}
        </group>
    );
};

// --- BOX SELECTOR ---
const BoxSelector = () => {
  const { transformMode, setSelection, shapes, setIsDragging } = useStore();
  const { camera, gl, size } = useThree();
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (transformMode !== 'select') return;

    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
       if (e.button !== 0) return; // Left click only
       setIsSelecting(true);
       setIsDragging(true);
       setStartPoint({ x: e.clientX, y: e.clientY });
       setEndPoint({ x: e.clientX, y: e.clientY });
    };

    const onPointerMove = (e: PointerEvent) => {
       if (!isSelecting) return;
       setEndPoint({ x: e.clientX, y: e.clientY });
    };

    const onPointerUp = (e: PointerEvent) => {
       if (!isSelecting || !startPoint || !endPoint) return;
       
       const startX = Math.min(startPoint.x, endPoint.x);
       const endX = Math.max(startPoint.x, endPoint.x);
       const startY = Math.min(startPoint.y, endPoint.y);
       const endY = Math.max(startPoint.y, endPoint.y);

       // Threshold to distinguish click from drag
       if (Math.abs(endX - startX) > 5 || Math.abs(endY - startY) > 5) {
          const newSelection: string[] = [];
          
          shapes.forEach(shape => {
              if (!shape.visible || shape.locked) return;
              const pos = new THREE.Vector3(...shape.position);
              pos.project(camera); 

              const x = (pos.x * 0.5 + 0.5) * size.width;
              const y = (-(pos.y * 0.5) + 0.5) * size.height;

              // Check logic relies on client coordinates being relative to viewport top-left
              // Assuming canvas covers full screen, e.clientX/Y match projected coordinates (inverted Y)
              // We need to match the DOM event coordinates with projected coordinates
              
              // Project returns normalized device coordinates (-1 to 1)
              // We convert to CSS pixels (0 to width, 0 to height)
              
              // e.clientX/Y are strictly relative to viewport.
              
              if (x >= startX && x <= endX && y >= startY && y <= endY) {
                newSelection.push(shape.id);
              }
          });
          setSelection(newSelection);
       }
       
       setIsSelecting(false);
       setIsDragging(false);
       setStartPoint(null);
       setEndPoint(null);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
       canvas.removeEventListener('pointerdown', onPointerDown);
       window.removeEventListener('pointermove', onPointerMove);
       window.removeEventListener('pointerup', onPointerUp);
    };
  }, [transformMode, isSelecting, startPoint, shapes, camera, size, setSelection, setIsDragging, gl.domElement]);

  if (!isSelecting || !startPoint || !endPoint) return null;

  const left = Math.min(startPoint.x, endPoint.x);
  const top = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  return (
     <Html fullscreen style={{ pointerEvents: 'none', zIndex: 100 }}>
        <div style={{
          position: 'fixed',
          left: left,
          top: top,
          width: width,
          height: height,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid #3b82f6',
          pointerEvents: 'none'
        }} />
     </Html>
  );
};

// --- CONTROLS ---
const Controls = () => {
  const { selectedIds, updateShape, shapes, transformMode, snapEnabled, snapGrid, objectSnapEnabled, isDrawing, snapshot, duplicateSelected } = useStore();
  
  // Hide controls in select mode
  if (transformMode === 'select') return null;

  // Only show transformer if exactly one object (or group) is selected
  const activeId = selectedIds.length === 1 ? selectedIds[0] : null;
  const activeShape = activeId ? shapes.find(s => s.id === activeId) : null;

  if (isDrawing || !activeShape || !activeShape.visible || activeShape.locked) return null;

  return (
    <TransformControls
      mode={transformMode as any}
      translationSnap={snapEnabled ? snapGrid : undefined}
      rotationSnap={snapEnabled ? Math.PI / 4 : undefined}
      scaleSnap={snapEnabled ? 0.1 : undefined}
      position={activeShape.position}
      rotation={activeShape.rotation}
      scale={activeShape.scale}
      onMouseDown={(e: any) => {
         // ALT + Drag Logic: Duplicate on start
         if (e?.altKey || (window.event as KeyboardEvent)?.altKey) {
            duplicateSelected(false); // Duplicate in place
         }
         snapshot();
      }}
      onObjectChange={(e: any) => {
         if (e?.target?.object) {
           const o = e.target.object;
           updateShape(activeShape.id, {
             position: [o.position.x, o.position.y, o.position.z],
             rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
             scale: [o.scale.x, o.scale.y, o.scale.z]
           });
         }
      }}
    />
  );
};

const SceneContent = () => {
  const { 
    shapes, selectedIds, backgroundColor, gridVisible, selectShape, isDrawing, 
    gridSpacing, gridColor, gridSectionColor, sunSettings, exportRequested, transformMode, isDragging 
  } = useStore();
  const exportGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (exportRequested && exportGroupRef.current) {
       const exporter = new GLTFExporter();
       const sceneClone = exportGroupRef.current.clone();

       sceneClone.userData.appSettings = {
           backgroundColor,
           gridVisible,
           gridSpacing,
           gridColor,
           gridSectionColor,
           sunSettings
       };

       const toRemove: THREE.Object3D[] = [];
       sceneClone.traverse((child) => {
           const c = child as any;
           if (c.isLine || c.isLineSegments || !child.visible) toRemove.push(child);
       });
       toRemove.forEach(c => c.parent?.remove(c));
       
       exporter.parse(sceneClone, (gltf) => {
          if (gltf instanceof ArrayBuffer) {
             const blob = new Blob([gltf], { type: 'application/octet-stream' });
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = 'scene.glb';
             link.click();
          } else {
             const output = JSON.stringify(gltf, null, 2);
             const blob = new Blob([output], { type: 'text/plain' });
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = 'scene.gltf';
             link.click();
          }
       }, (err) => console.error(err), { binary: true });
    }
  }, [exportRequested, backgroundColor, gridVisible, gridSpacing, gridColor, gridSectionColor, sunSettings]);

  return (
    <>
      <CameraHandler />
      <color attach="background" args={[backgroundColor]} />
      {!sunSettings.enabled && <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />}
      <SunPathDiagram />
      <hemisphereLight intensity={sunSettings.enabled ? 0.2 : 0.4} groundColor="white" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[1000, 1000]} /><shadowMaterial transparent opacity={0.3} color={sunSettings.enabled ? sunSettings.shadowColor : '#000000'} /></mesh>

      {gridVisible && <Grid infiniteGrid fadeDistance={60} cellColor={gridColor} sectionColor={gridSectionColor} cellSize={gridSpacing} sectionSize={gridSpacing * 5} />}
      <Environment preset="city" />
      <DrawingPlane />
      
      <BoxSelector />

      <group ref={exportGroupRef} onPointerMissed={() => !isDrawing && transformMode !== 'select' && selectShape(null)}>
        {shapes.filter(s => !s.parentId).map((shape) => (
          <ShapeMesh key={shape.id} data={shape} />
        ))}
      </group>

      <Controls />
      <OrbitControls 
        makeDefault 
        enabled={!isDragging} // Disable orbit when box-selecting or dragging objects
        mouseButtons={{
           LEFT: transformMode === 'select' ? undefined : THREE.MOUSE.ROTATE, // Free up Left Click for Box Select
           MIDDLE: THREE.MOUSE.DOLLY,
           RIGHT: THREE.MOUSE.PAN
        }}
      />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}><GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="black" /></GizmoHelper>
    </>
  );
};

export const EditorScene: React.FC = () => {
  const { viewMode } = useStore();
  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        {viewMode === 'orthographic' ? <OrthographicCamera makeDefault position={[30, 30, 30]} zoom={30} near={-100} far={500} /> : <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} />}
        <SceneContent />
      </Canvas>
    </div>
  );
};
