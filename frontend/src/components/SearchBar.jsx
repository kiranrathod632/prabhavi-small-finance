import { HiSearch } from 'react-icons/hi';

const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative ${className}`}>
    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input pl-9 sm:pl-11"
    />
  </div>
);

export default SearchBar;
