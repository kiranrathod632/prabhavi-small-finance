import { getStatusColor, getStatusLabel } from '../utils/helpers';

const Badge = ({ status, children }) => (
  <span className={`badge ${getStatusColor(status)}`}>
    {children || getStatusLabel(status)}
  </span>
);

export default Badge;
