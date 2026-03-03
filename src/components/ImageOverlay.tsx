'use client';

import React from 'react';
import { OverlaySpec } from '@/lib/schemas';

interface CropWindow {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface ImageOverlayProps {
    imageSrc: string;
    overlay: OverlaySpec;
    cropWindow?: CropWindow;
}

export default function ImageOverlay({ imageSrc, overlay, cropWindow }: ImageOverlayProps) {
    const { boxes, lines, points, arrows } = overlay;

    // If cropWindow is set, compute CSS transform to zoom into that region.
    // We apply this transform to an INNER div, while the OUTER div clips with overflow-hidden.
    let innerStyle: React.CSSProperties = {};
    if (cropWindow) {
        const scaleX = 1000 / cropWindow.w;
        const scaleY = 1000 / cropWindow.h;
        const scale = Math.min(scaleX, scaleY);
        const originX = (cropWindow.x / 1000) * 100;
        const originY = (cropWindow.y / 1000) * 100;
        innerStyle = {
            transform: `scale(${scale})`,
            transformOrigin: `${originX}% ${originY}%`,
        };
    }

    return (
        <div className="relative w-full rounded-lg bg-zinc-900 overflow-hidden" style={{ zIndex: 0 }}>
            <div style={innerStyle}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageSrc}
                    alt="Machinist print"
                    className="block w-full h-auto"
                    style={{ display: 'block' }}
                />
                <svg
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                >
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="6"
                            markerHeight="6"
                            refX="3"
                            refY="3"
                            orient="auto"
                        >
                            <path d="M 0 0 L 6 3 L 0 6 Z" fill="#00FF00" />
                        </marker>
                        <marker
                            id="arrowhead-custom"
                            markerWidth="6"
                            markerHeight="6"
                            refX="3"
                            refY="3"
                            orient="auto"
                        >
                            <path d="M 0 0 L 6 3 L 0 6 Z" fill="currentColor" />
                        </marker>
                    </defs>

                    {/* Boxes */}
                    {boxes.map((box, i) => (
                        <g key={`box-${i}`}>
                            <rect
                                x={box.x}
                                y={box.y}
                                width={box.w}
                                height={box.h}
                                fill="none"
                                stroke={box.strokeColor ?? '#00FF00'}
                                strokeWidth="3"
                                strokeDasharray="8 4"
                            />
                            {box.label && (
                                <text
                                    x={box.x + 6}
                                    y={box.y + 20}
                                    fill={box.strokeColor ?? '#00FF00'}
                                    fontSize="18"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    style={{ textShadow: '0 0 4px #000' }}
                                >
                                    {box.label}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Lines */}
                    {lines.map((line, i) => (
                        <g key={`line-${i}`}>
                            <line
                                x1={line.x1}
                                y1={line.y1}
                                x2={line.x2}
                                y2={line.y2}
                                stroke={line.strokeColor ?? '#00FF00'}
                                strokeWidth="2.5"
                            />
                            {line.label && (
                                <text
                                    x={(line.x1 + line.x2) / 2 + 6}
                                    y={(line.y1 + line.y2) / 2 - 6}
                                    fill={line.strokeColor ?? '#00FF00'}
                                    fontSize="16"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                >
                                    {line.label}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Points */}
                    {points.map((pt, i) => (
                        <g key={`pt-${i}`}>
                            <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="5"
                                fill={pt.color ?? '#00FF00'}
                                stroke="#fff"
                                strokeWidth="1.5"
                            />
                            {pt.label && (
                                <text
                                    x={pt.x + 10}
                                    y={pt.y + 5}
                                    fill={pt.color ?? '#00FF00'}
                                    fontSize="15"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                >
                                    {pt.label}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Arrows */}
                    {arrows.map((arrow, i) => (
                        <g key={`arrow-${i}`}>
                            <line
                                x1={arrow.fromX}
                                y1={arrow.fromY}
                                x2={arrow.toX}
                                y2={arrow.toY}
                                stroke={arrow.strokeColor ?? '#00FF00'}
                                strokeWidth="2.5"
                                markerEnd="url(#arrowhead)"
                            />
                            {arrow.label && (
                                <text
                                    x={arrow.fromX + 6}
                                    y={arrow.fromY - 6}
                                    fill={arrow.strokeColor ?? '#00FF00'}
                                    fontSize="16"
                                    fontFamily="monospace"
                                    fontWeight="bold"
                                >
                                    {arrow.label}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
