import { OrientationStepResult } from './schemas';

export const MOCK_STEP_1: OrientationStepResult = {
    proposalData: [
        { id: 'view-1', label: 'Primary View', isPrimary: true, boundingBox: { x: 50, y: 50, w: 400, h: 400 } },
        { id: 'view-2', label: 'Side View', isPrimary: false, boundingBox: { x: 500, y: 50, w: 200, h: 400 } }
    ],
    overlay: {
        boxes: [
            { x: 50, y: 50, w: 400, h: 400, label: 'Primary View', strokeColor: '#00FF00' },
            { x: 500, y: 50, w: 200, h: 400, label: 'Side View', strokeColor: '#FFFF00' }
        ],
        lines: [], points: [], arrows: []
    },
    question: 'Are these the bounding boxes for the views, and is the highlighted one the primary view?'
};

export const MOCK_STEP_2: OrientationStepResult = {
    proposalData: {
        boxes: [
            { x: 60, y: 60, w: 380, h: 380, label: 'Primary View Envelope', strokeColor: '#FF0000' },
            { x: 510, y: 60, w: 180, h: 380, label: 'Side View Envelope', strokeColor: '#00BFFF' }
        ],
        lines: [], points: [], arrows: []
    },
    overlay: {
        boxes: [
            { x: 60, y: 60, w: 380, h: 380, label: 'Primary View Envelope', strokeColor: '#FF0000' },
            { x: 510, y: 60, w: 180, h: 380, label: 'Side View Envelope', strokeColor: '#00BFFF' }
        ],
        lines: [], points: [], arrows: []
    },
    question: 'Do these boxes accurately capture the part outline in each view?'
};

export const MOCK_STEP_3: OrientationStepResult = {
    proposalData: {
        length: { value: 120, unit: 'mm', sourceViewId: 'view-1', confidence: 0.95 },
        width: { value: 80, unit: 'mm', sourceViewId: 'view-2', confidence: 0.90 }
    },
    overlay: {
        boxes: [], lines: [], points: [],
        arrows: [
            { fromX: 70, fromY: 480, toX: 250, toY: 450, label: 'Length (L): 120mm', strokeColor: '#00FF00' },
            { fromX: 550, fromY: 480, toX: 600, toY: 250, label: 'Width (W): 80mm', strokeColor: '#00BFFF' }
        ]
    },
    question: 'Are the Length and Width values correct? Check the source views.'
};

export const MOCK_STEP_4: OrientationStepResult = {
    proposalData: { value: 35, unit: 'mm', sourceViewId: 'view-2', confidence: 0.85 },
    overlay: {
        boxes: [{ x: 500, y: 50, w: 200, h: 400, strokeColor: '#FFFF00' }],
        lines: [], points: [],
        arrows: [{ fromX: 750, fromY: 100, toX: 710, toY: 120, label: 'Depth (D): 35mm' }]
    },
    question: 'Is this the correct depth (thickness) dimension?'
};

export const MOCK_STEP_5: OrientationStepResult = {
    proposalData: {
        primaryFace: 'top',
        axisLabels: { x: 'L', y: 'W', z: 'D' }
    },
    overlay: {
        boxes: [], points: [{ x: 250, y: 250, label: 'Datum A Origin' }], arrows: [],
        lines: [
            { x1: 250, y1: 250, x2: 400, y2: 250, label: 'X (L)' },
            { x1: 250, y1: 250, x2: 250, y2: 100, label: 'Y (W)' },
            { x1: 250, y1: 250, x2: 150, y2: 350, label: 'Z (D)' }
        ]
    },
    question: 'Lock final orientation?'
};
