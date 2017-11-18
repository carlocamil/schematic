import * as THREE from "three";
import { edgeMaterial, faceMaterial } from "../materials";

class Model {
  geometry: THREE.Geometry;
  mesh: THREE.Mesh;
  faceColor: THREE.Color;
  faceHighlightColor: THREE.Color;
  edgesGeometry: THREE.EdgesGeometry;
  private lineSegments: THREE.LineSegments;

  constructor(edges: number[][], faceColor, faceHighlightColor, amount = 5) {
    const shape = new THREE.Shape();
    edges.forEach(([x, y], index) => {
      if (index == 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    const extrudeSettings = {
      amount,
      bevelEnabled: false,
      steps: 1
    };
    this.geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // this.geometry = new THREE.BoxGeometry(2, 2, 2);
    this.geometry.translate(0, 1, 0);
    this.mesh = new THREE.Mesh(this.geometry, faceMaterial);
    this.faceColor = new THREE.Color(faceColor);
    this.faceHighlightColor = new THREE.Color(faceHighlightColor);

    this.edgesGeometry = new THREE.EdgesGeometry(<any>this.geometry, 1);
    this.lineSegments = new THREE.LineSegments(
      this.edgesGeometry,
      edgeMaterial
    );
    this.mesh.add(this.lineSegments);
  }

  updateMaterials() {
    this.geometry.colorsNeedUpdate = true;
  }

  updateGeometry() {
    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
    this.geometry.computeFlatVertexNormals();
    this.geometry.mergeVertices();
    // todo: replace with this.edgesGeometry.fromGeometry(this.geometry)
    this.edgesGeometry = new THREE.EdgesGeometry(<any>this.geometry, 1);
    this.lineSegments.geometry = this.edgesGeometry;
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  set position(newPosition: THREE.Vector3) {
    this.mesh.position = newPosition;
  }
}

export default Model;
