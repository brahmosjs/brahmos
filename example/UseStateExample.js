import Brahmos, { useState } from '../src';
import friends from './friends.json';

export default function UseStateExample() {
  const [filterStr, setFilter] = useState('');
  const filteredLower = filterStr.toLowerCase();
  const filteredFriend = friends.filter(({ name }) => {
    return name.toLowerCase().startsWith(filteredLower);
  });

  return (
    <div>
      <input value={filterStr} onChange={(e) => setFilter(e.target.value)} />
      <ul>
        {filteredFriend.map(({ _id, name }) => {
          return <li key={_id}>{name}</li>;
        })}
      </ul>
    </div>
  );
}
