import {
  Point,
  distance,
  pointOnLine,
  percentageOnLine,
  angle,
  rotateAroundPoint,
  bounds
} from "../utils/point";

import Block from "./block";
import Corner from "./corner";
import Wall from "./wall";
import { flatMap } from "lodash";

import { loopifyInPairs, loopifyInGroups, safeIndex } from "../utils/list";
import { offset } from "../clipper";
import { take } from "rxjs/operator/take";

const pointDistance = 15;
const finWidth = 12.5;

interface Line {
  subPoints: Point[];
  outerSubPoints: Point[];
  innerSubPoints: Point[];
  angle: number;
  length: number;
  blocks: Block[];
  corner?: Corner;
}

class Wren {
  innerPoints: Point[];
  outerPoints: Point[];
  points: Point[];
  normalizedPoints: Point[];
  lines: Line[];
  reinforcers: Point[][] = [];
  finPieces: Point[][] = [];
  outerWalls: Point[][] = [];
  innerWalls: Point[][] = [];

  constructor(points) {
    // offset with 0 to normalize direction of points (clockwise or counter-clockwise)
    this.points = offset(points, { DELTA: 0 });
    const pointBounds = bounds(points);
    this.normalizedPoints = this.points.map(([x, y]): Point => [
      // x - pointBounds.offsetX, // centered point
      x - pointBounds.minX,
      pointBounds.maxY - y
    ]);
    this.outerPoints = offset(points, { DELTA: finWidth });
    this.innerPoints = offset(points, { DELTA: -finWidth });
    this.lines = this.calculateLines(this.points);
    this.calculateCorners();

    this.calculateReinforcers();
    this.calculateFinPieces();
    this.calculateWalls("innerWalls", this.innerPoints, -120);
    this.calculateWalls("outerWalls", this.outerPoints, 120);
  }

  private calculateLines = (_points): Line[] => {
    return loopifyInPairs(_points).map(([start, end], index) => {
      const lineAngle = angle(start, end);
      const length = distance(start, end);
      const halfLength = length / 2;

      // 1. Calculate the main sub-points -----------------------------------

      const subPoints: Point[] = [];
      // get all points going outwards from start, to the center
      let i = 0;
      for (i = pointDistance; i < halfLength; i += pointDistance * 2) {
        subPoints.push(pointOnLine(i)(start, end));
      }
      // get all points going inwards from end, to the center
      const lastPoints: Point[] = [];
      for (i = pointDistance; i < halfLength; i += pointDistance * 2) {
        lastPoints.push(pointOnLine(i)(end, start));
      }
      // reverse the inward points and join with outward points, to get a
      // contiguous list of points, going outwards from start to end
      subPoints.push(...lastPoints.reverse());

      // 2. Calculate the inner & outer sub-points --------------------------

      let outerSubPoints = [];
      let innerSubPoints = [];
      subPoints.forEach(point => {
        // loop through each subpoint, add or subtract an X value, then
        // rotate by the line's angle, to get an offset point on the line
        const rotate = rotateAroundPoint(point, lineAngle);
        innerSubPoints.push(rotate([point[0], point[1] + finWidth]));
        outerSubPoints.push(rotate([point[0], point[1] - finWidth]));
      });

      // 3. Use inner & outer sub-points to generate blocks -----------------

      let blocks = [];
      for (i = 0; i < subPoints.length - 1; i++) {
        blocks.push(
          new Block(
            lineAngle,
            subPoints[i],
            innerSubPoints[i],
            innerSubPoints[i + 1],
            outerSubPoints[i + 1],
            outerSubPoints[i]
          )
        );
      }

      return {
        angle: lineAngle,
        length,
        subPoints,
        outerSubPoints,
        innerSubPoints,
        blocks
      };
    });
  };

  private calculateCorners = () => {
    const index = safeIndex(this.lines.length);
    // for (let i = 0; i < linePairs.length; i++) {
    for (let i = 0; i < this.lines.length; i++) {
      const nextI = index(i + 1);
      const prevLine = this.lines[i];
      const nextLine = this.lines[nextI];

      const corner = new Corner(
        prevLine.outerSubPoints[prevLine.outerSubPoints.length - 1],
        this.outerPoints[nextI],
        nextLine.outerSubPoints[0],
        nextLine.innerSubPoints[0],
        this.innerPoints[nextI],
        prevLine.innerSubPoints[prevLine.outerSubPoints.length - 1]
      );
      prevLine.corner = corner;
    }
  };

  private calculateReinforcers = () => {
    const index = safeIndex(this.lines.length);
    for (let i = 0; i < this.lines.length; i++) {
      const nextI = index(i + 1);
      const prevLine = this.lines[i];
      const nextLine = this.lines[nextI];
      const blocks = [
        ...prevLine.blocks.slice(-2),
        prevLine.corner,
        ...nextLine.blocks.slice(0, 2)
      ];

      this.reinforcers.push(
        flatMap(blocks, geometry => geometry.outerPoints).concat(
          flatMap(blocks.reverse(), geometry => geometry.innerPoints)
        )
      );
    }
  };

  private calculateFinPieces = () => {
    const index = safeIndex(this.lines.length);
    for (let i = 0; i < this.lines.length; i++) {
      const blocks = this.lines[i].blocks;
      this.finPieces.push(
        flatMap(blocks, geometry => geometry.outerPoints).concat(
          flatMap(blocks.reverse(), geometry => geometry.innerPoints)
        )
      );
    }
  };

  private calculateWalls = (name, points, distance) => {
    const index = safeIndex(points.length);
    for (let i = 0; i < points.length; i++) {
      this[name].push(
        new Wall(distance, points[i], this.lines[i].angle, [
          points[i],
          points[index(i + 1)]
        ]).points
      );
    }
  };
}

export default Wren;
