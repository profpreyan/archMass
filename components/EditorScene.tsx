
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
  Html
} from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { ShapeData } from '../types';

// --- CUSTOM SHAPES ---
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

    const extrudeDepth = data.extrudeDepth || 0;
    const isFlat = extrudeDepth <= 0.01;

    const extrudeSettings = useMemo(() => ({
        depth: -Math.max(0.01, extrudeDepth), 
        bevelEnabled: false
    }), [extrudeDepth]);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            {isFlat ? (
              <shapeGeometry args={[shape]} />
            ) : (
              <extrudeGeometry args={[shape, extrudeSettings]} />
            )}
            
            <meshStandardMaterial 
                color={data.color} 
                transparent 
                opacity={data.opacity} 
                wireframe={data.wireframe}
                side={THREE.DoubleSide}
            />
            {data.edges && <Edges threshold={15} color={data.edgeColor} />}
        </mesh>
    );
};

// --- TREE COMPONENT ---
const TreeMesh: React.FC<{ data: ShapeData }> = ({ data }) => {
  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshStandardMaterial color={data.secondaryColor || '#5d4037'} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={data.color} transparent opacity={data.opacity} wireframe={data.wireframe} />
        {data.edges && <Edges threshold={20} color={data.edgeColor} />}
      </mesh>
    </group>
  );
};

// --- IMAGE COMPONENT ---
const ImageMesh: React.FC<{ data: ShapeData }> = ({ data }) => {
  const texture = useLoader(THREE.TextureLoader, data.imageUrl || '');
  
  return (
    <mesh position={[0,0,0]} castShadow receiveShadow>
      <planeGeometry args={[1 * (data.aspectRatio || 1), 1]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={data.opacity} 
        side={THREE.DoubleSide}
        toneMapped={false}
      />
      {data.edges && <Edges threshold={15} color={data.edgeColor} />}
    </mesh>
  );
};

// --- MAIN MESH COMPONENT ---
const ShapeMesh: React.FC<{ data: ShapeData; isSelected: boolean }> = ({ data, isSelected }) => {
  const { selectShape, transformMode, updateShape, setTransformMode, setIsDragging, snapshot } = useStore();
  const meshRef = useRef<THREE.Mesh>(null);
  
  const dragRef = useRef<{ startY: number, startVal: number, pointerId: number } | null>(null);

  const handlePointerDown = (e: any) => {
    // Prevent interaction if hidden or locked
    if (!data.visible || data.locked) return;

    if (transformMode === 'pushpull') {
      e.stopPropagation();
      selectShape(data.id);
      snapshot(); // Snapshot before push/pull
      
      const startValue = data.type === 'custom' 
        ? (data.extrudeDepth || 0) 
        : data.scale[1];

      (e.target as Element).setPointerCapture(e.pointerId);
      
      dragRef.current = {
        startY: e.point.y,
        startVal: startValue,
        pointerId: e.pointerId
      };
      
      setIsDragging(true); 
    } else {
      e.stopPropagation();
      selectShape(data.id);
    }
  };

  const handlePointerUp = (e: any) => {
     if (dragRef.current) {
        (e.target as Element).releasePointerCapture(dragRef.current.pointerId);
        dragRef.current = null;
        setIsDragging(false); 
     }
  };

  const handlePointerMove = (e: any) => {
    // Prevent interaction if hidden or locked
    if (!data.visible || data.locked) return;

    if (transformMode === 'pushpull' && dragRef.current) {
       e.stopPropagation();
       
       const deltaY = e.point.y - dragRef.current.startY;
       
       const val = Math.max(0, dragRef.current.startVal + deltaY);

       if (data.type === 'custom') {
          updateShape(data.id, { extrudeDepth: val });
       } else if (data.type === 'box' || data.type === 'cylinder' || data.type === 'cone') {
          const newScale = [...data.scale] as [number, number, number];
          newScale[1] = Math.max(0.1, val);
          updateShape(data.id, { scale: newScale });
       }
    }
  };

  const handleCursor = (e: any) => {
     if (!data.visible || data.locked) {
        document.body.style.cursor = 'auto';
        return;
     }

     if (transformMode === 'pushpull') {
        document.body.style.cursor = 'ns-resize';
     } else {
        document.body.style.cursor = 'auto';
     }
  };

  // Even for complex types (tree, image, custom), wrapper group needs selection logic disabled if locked/hidden
  // Note: Raycasting still hits invisible objects unless we filter them, but here we just stop logic execution.
  
  const interactionProps = (!data.visible || data.locked) ? {} : {
      onClick: handlePointerDown, // Alias for click in most cases
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerMove: handlePointerMove,
      onPointerOver: handleCursor,
      onPointerOut: () => { document.body.style.cursor = 'auto'; }
  };

  if (data.type === 'tree') {
    return (
      <group
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        visible={data.visible}
        {...interactionProps}
      >
        <TreeMesh data={data} />
      </group>
    );
  }

  if (data.type === 'image' && data.imageUrl) {
     return (
      <group
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        visible={data.visible}
        {...interactionProps}
      >
        <ImageMesh data={data} />
      </group>
     )
  }

  if (data.type === 'custom' && data.points) {
    return (
      <group 
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        visible={data.visible}
        {...interactionProps}
      >
        <CustomShapeMesh points={data.points} data={data} />
      </group>
    );
  }

  const getGeometry = () => {
    switch (data.type) {
      case 'box': return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'plane': return <planeGeometry args={[1, 1]} />;
      default: return <boxGeometry />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={data.position}
      rotation={data.rotation}
      scale={data.scale}
      visible={data.visible}
      castShadow={data.type !== 'plane'}
      receiveShadow
      {...interactionProps}
    >
      {getGeometry()}
      <meshStandardMaterial 
        color={data.color} 
        transparent 
        opacity={data.opacity}
        wireframe={data.wireframe}
        side={THREE.DoubleSide}
      />
      {data.edges && (
        <Edges
          scale={1}
          threshold={15} 
          color={data.edgeColor}
        />
      )}
    </mesh>
  );
};

// --- DRAWING TOOL INTERACTION ---
const DrawingPlane = () => {
    const { isDrawing, addDrawingPoint, drawingPoints, finishDrawing, snapEnabled, snapGrid } = useStore();
    const [mousePos, setMousePos] = useState<[number, number, number] | null>(null);
    const [canCloseLoop, setCanCloseLoop] = useState(false);

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
        if (snapEnabled) {
           x = Math.round(x / snapGrid) * snapGrid;
           z = Math.round(z / snapGrid) * snapGrid;
        }
        
        if (drawingPoints.length > 2) {
            const start = drawingPoints[0];
            const dist = Math.sqrt(Math.pow(x - start[0], 2) + Math.pow(z - start[2], 2));
            if (dist < 0.4) {
                setCanCloseLoop(true);
                setMousePos([start[0], 0.05, start[2]]); 
                return;
            }
        }
        setCanCloseLoop(false);
        setMousePos([x, 0.05, z]); 
    };

    const handleClick = (e: any) => {
        e.stopPropagation();
        
        if (canCloseLoop) {
            finishDrawing();
            setCanCloseLoop(false);
            setMousePos(null);
            return;
        }

        let { x, z } = e.point;
        if (snapEnabled) {
           x = Math.round(x / snapGrid) * snapGrid;
           z = Math.round(z / snapGrid) * snapGrid;
        }
        addDrawingPoint([x, 0, z]);
    };

    const linePoints = [...drawingPoints];
    if (mousePos) linePoints.push(mousePos);

    return (
        <group>
            <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0.01, 0]} 
                onPointerMove={handlePointerMove}
                onClick={handleClick}
            >
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            {linePoints.length > 0 && (
                <Line 
                    points={linePoints} 
                    color="#2563eb" 
                    lineWidth={2} 
                />
            )}
            
            {drawingPoints.length > 0 && mousePos && (
                 <Line 
                    points={[drawingPoints[drawingPoints.length - 1], mousePos]}
                    color="#60a5fa"
                    lineWidth={1.5}
                    dashed
                    dashScale={2}
                 />
            )}
            
            {drawingPoints.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshBasicMaterial color={i === 0 && canCloseLoop ? "#ef4444" : "#2563eb"} />
                    {i === 0 && canCloseLoop && (
                        <Html position={[0, 0.2, 0]} center>
                             <div className="px-2 py-1 bg-red-500 text-white text-[10px] rounded shadow font-bold whitespace-nowrap">
                                Click to Close
                             </div>
                        </Html>
                    )}
                </mesh>
            ))}
            
            {mousePos && (
                 <group position={[mousePos[0], mousePos[1], mousePos[2]]}>
                    <mesh>
                       <sphereGeometry args={[0.05]} />
                       <meshBasicMaterial color="#ef4444" />
                    </mesh>
                    <Html position={[0.2, 0.2, 0]} pointerEvents="none">
                        <div className="text-[9px] font-mono bg-black/70 text-white px-1 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
                            {mousePos[0].toFixed(1)}, {mousePos[2].toFixed(1)}
                        </div>
                    </Html>
                 </group>
            )}
        </group>
    );
};

// --- CAMERA HANDLER ---
const CameraHandler = () => {
  const { cameraRequest } = useStore();
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraRequest) return;
    const dist = 30; 
    
    switch (cameraRequest.type) {
      case 'iso':
        camera.position.set(dist, dist, dist);
        break;
      case 'axo':
        camera.position.set(dist, dist * 1.5, dist);
        break;
      case 'top':
        camera.position.set(0, dist * 1.5, 0);
        break;
      case 'bottom':
        camera.position.set(0, -dist * 1.5, 0);
        break;
      case 'front':
        camera.position.set(0, 0, dist * 1.5);
        break;
      case 'back':
        camera.position.set(0, 0, -dist * 1.5);
        break;
      case 'right':
        camera.position.set(dist * 1.5, 0, 0);
        break;
      case 'left':
        camera.position.set(-dist * 1.5, 0, 0);
        break;
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [cameraRequest, camera]);

  return null;
};

// --- CONTROLS COMPONENT ---
const Controls = () => {
  const { 
    selectedId, updateShape, shapes, 
    transformMode, snapEnabled, snapGrid,
    objectSnapEnabled, isDrawing, snapshot
  } = useStore();
  
  const selectedShape = shapes.find(s => s.id === selectedId);

  if (isDrawing || transformMode === 'pushpull') return null;

  // Don't show controls if locked or hidden
  if (!selectedShape || !selectedShape.visible || selectedShape.locked) return null;

  const handleObjectSnap = (currentObject: THREE.Object3D) => {
    if (!objectSnapEnabled) return currentObject.position.clone();
    const newPos = currentObject.position.clone();
    const threshold = 0.5;

    shapes.forEach(other => {
      if (other.id === selectedId || !other.visible) return;
      if (Math.abs(newPos.x - other.position[0]) < threshold) newPos.x = other.position[0];
      if (Math.abs(newPos.y - other.position[1]) < threshold) newPos.y = other.position[1];
      if (Math.abs(newPos.z - other.position[2]) < threshold) newPos.z = other.position[2];
    });
    return newPos;
  };

  return (
    <>
      {selectedShape && (
        <TransformControls
          mode={transformMode as 'translate' | 'rotate' | 'scale'}
          translationSnap={snapEnabled ? snapGrid : undefined}
          rotationSnap={snapEnabled ? Math.PI / 4 : undefined}
          scaleSnap={snapEnabled ? 0.1 : undefined}
          position={selectedShape.position}
          rotation={selectedShape.rotation}
          scale={selectedShape.scale}
          onMouseDown={() => snapshot()} // Save state before starting transformation
          onObjectChange={(e: any) => {
             if (e?.target?.object) {
               const o = e.target.object;
               if (objectSnapEnabled && transformMode === 'translate') {
                  const snappedPos = handleObjectSnap(o);
                  o.position.copy(snappedPos);
               }
               updateShape(selectedShape.id, {
                 position: [o.position.x, o.position.y, o.position.z],
                 rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                 scale: [o.scale.x, o.scale.y, o.scale.z]
               });
             }
          }}
        />
      )}
    </>
  );
};

const SceneContent = () => {
  const { shapes, selectedId, backgroundColor, gridVisible, selectShape, isDrawing, transformMode, isDragging, gridSpacing, gridColor, gridSectionColor } = useStore();

  return (
    <>
      <CameraHandler />
      <color attach="background" args={[backgroundColor]} />
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight intensity={0.3} groundColor="white" />

      {gridVisible && (
        <Grid 
          infiniteGrid 
          fadeDistance={60} 
          fadeStrength={5} 
          cellColor={gridColor} 
          sectionColor={gridSectionColor}
          cellSize={gridSpacing}
          sectionSize={gridSpacing * 5}
        />
      )}
      <Environment preset="city" />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={40} blur={2.5} far={4.5} />

      <DrawingPlane />

      <group onPointerMissed={() => !isDrawing && transformMode !== 'pushpull' && selectShape(null)}>
        {shapes.map((shape) => (
          <ShapeMesh 
            key={shape.id} 
            data={shape} 
            isSelected={shape.id === selectedId} 
          />
        ))}
      </group>

      <Controls />
      
      <OrbitControls makeDefault enabled={!isDragging} />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="black" />
      </GizmoHelper>
    </>
  );
};

export const EditorScene: React.FC = () => {
  const { viewMode } = useStore();
  
  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        {viewMode === 'orthographic' ? (
           <OrthographicCamera makeDefault position={[30, 30, 30]} zoom={30} near={-100} far={500} onUpdate={c => c.lookAt(0, 0, 0)} />
        ) : (
           <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={50} onUpdate={c => c.lookAt(0, 0, 0)} />
        )}
        <SceneContent />
      </Canvas>
    </div>
  );
};
