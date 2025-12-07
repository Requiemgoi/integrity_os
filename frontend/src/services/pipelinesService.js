import api from './authService';

const USE_FAKE_PIPELINES = true;

const fakePipelines = [
  {
    id: 1,
    name: 'Астана — кольцо',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [71.3, 51.25],
        [71.5, 51.25],
        [71.7, 51.2],
        [71.7, 51.1],
        [71.5, 51.05],
        [71.3, 51.05],
        [71.2, 51.15],
        [71.3, 51.25],
      ],
    }),
  },
  {
    id: 2,
    name: 'Астана — магистраль север-юг',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [71.4, 51.35],
        [71.45, 51.3],
        [71.5, 51.25],
        [71.5, 51.15],
        [71.5, 51.05],
        [71.5, 50.95],
      ],
    }),
  },
  {
    id: 3,
    name: 'Алматы — магистраль',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [76.7, 43.2],
        [76.8, 43.25],
        [76.9, 43.28],
        [77.0, 43.3],
        [77.1, 43.32],
      ],
    }),
  },
  {
    id: 4,
    name: 'Алматы — южное ответвление',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [76.9, 43.28],
        [76.92, 43.24],
        [76.95, 43.2],
      ],
    }),
  },
  {
    id: 5,
    name: 'Караганда — магистраль',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [73.0, 49.75],
        [73.05, 49.8],
        [73.1, 49.85],
        [73.15, 49.9],
      ],
    }),
  },
  {
    id: 6,
    name: 'Караганда — восточное ответвление',
    pipeline_code: 'MT-03',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [73.1, 49.85],
        [73.2, 49.9],
        [73.3, 49.95],
      ],
    }),
  },
  {
    id: 7,
    name: 'Шымкент — магистраль',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.5, 42.3],
        [69.55, 42.35],
        [69.6, 42.4],
        [69.65, 42.45],
      ],
    }),
  },
  {
    id: 8,
    name: 'Шымкент — северное ответвление',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.6, 42.4],
        [69.65, 42.48],
        [69.7, 42.55],
      ],
    }),
  },
  {
    id: 9,
    name: 'Магистраль Шымкент–Алматы',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.5, 42.3],
        [70.0, 42.8],
        [76.7, 43.2],
      ],
    }),
  },
  {
    id: 10,
    name: 'Магистраль Караганда–Астана',
    pipeline_code: 'MT-01',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [73.0, 49.75],
        [72.3, 50.4],
        [71.5, 51.2],
      ],
    }),
  },
  {
    id: 11,
    name: 'Астана — зелёное ответвление 1',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [71.5, 51.2],
        [71.6, 51.25],
        [71.7, 51.3],
      ],
    }),
  },
  {
    id: 12,
    name: 'Алматы — зелёное ответвление 2',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [76.8, 43.25],
        [76.85, 43.3],
        [76.9, 43.35],
      ],
    }),
  },
  {
    id: 13,
    name: 'Караганда — зелёное ответвление 2',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [73.05, 49.8],
        [73.1, 49.85],
        [73.15, 49.9],
      ],
    }),
  },
  {
    id: 14,
    name: 'Шымкент — зелёное ответвление 3',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.55, 42.35],
        [69.6, 42.4],
        [69.65, 42.45],
      ],
    }),
  },
  {
    id: 15,
    name: 'Шымкент — зелёное ответвление 4',
    pipeline_code: 'MT-02',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.65, 42.45],
        [69.7, 42.5],
        [69.75, 42.55],
      ],
    }),
  },
  {
    id: 16,
    name: 'Астана — оранжевое ответвление 1',
    pipeline_code: 'MT-03',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [71.3, 51.25],
        [71.25, 51.3],
        [71.2, 51.35],
      ],
    }),
  },
  {
    id: 17,
    name: 'Алматы — оранжевое ответвление 2',
    pipeline_code: 'MT-03',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [77.0, 43.3],
        [77.05, 43.35],
        [77.1, 43.4],
      ],
    }),
  },
  {
    id: 18,
    name: 'Караганда — оранжевое ответвление 2',
    pipeline_code: 'MT-03',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [73.15, 49.9],
        [73.2, 49.95],
        [73.25, 50.0],
      ],
    }),
  },
  {
    id: 19,
    name: 'Шымкент — оранжевое ответвление 3',
    pipeline_code: 'MT-03',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [69.7, 42.55],
        [69.75, 42.6],
        [69.8, 42.65],
      ],
    }),
  },
  {
    id: 20,
    name: 'Астана — красная линия (аварийная)',
    pipeline_code: 'MT-04',
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: [
        [71.6, 51.05],
        [71.7, 51.0],
        [71.8, 50.95],
      ],
    }),
  },
];

export const pipelinesService = {
  getPipelines: async () => {
    if (USE_FAKE_PIPELINES) {
      return fakePipelines;
    }

    const response = await api.get('/api/pipelines');
    return response.data;
  },
};
