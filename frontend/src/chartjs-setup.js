import {
  Chart as ChartJS,
  CategoryScale, LinearScale, TimeScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale, LinearScale, TimeScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler
);



