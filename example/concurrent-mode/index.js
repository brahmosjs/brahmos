/**
 * Forked from: https://codesandbox.io/s/jovial-lalande-26yep?file=/src/index.js:0-1646
 */
import Brahmos, { useState, useTransition, Suspense } from '../../src';

import { fetchProfileData } from './fakeApi';

function getNextId(id) {
  return id === 3 ? 0 : id + 1;
}

const initialResource = fetchProfileData(0);

function App() {
  const [resource, setResource] = useState(initialResource);
  const [startTransition, isPending] = useTransition({
    timeoutMs: 3000,
  });
  return (
    <>
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            const nextUserId = getNextId(resource.userId);
            setResource(fetchProfileData(nextUserId));
          });
        }}
      >
        Next
      </button>
      {isPending ? ' Loading...' : null}
      <ProfilePage resource={resource} />
      <p className="attribute">
        This demo is forked from concurrent mode demo of React:
        <br />
        <strong>Source: </strong>
        <a
          href="https://codesandbox.io/s/jovial-lalande-26yep?file=/src/index.js:0-1646"
          target="_blank"
        >
          https://codesandbox.io/s/jovial-lalande-26yep?file=/src/index.js:0-1646
        </a>
      </p>
    </>
  );
}

function ProfilePage({ resource }) {
  return (
    <Suspense fallback={<h1>Loading profile...</h1>}>
      <ProfileDetails resource={resource} />
      <Suspense fallback={<h1>Loading posts...</h1>}>
        <ProfileTimeline resource={resource} />
      </Suspense>
    </Suspense>
  );
}

function ProfileDetails({ resource }) {
  const user = resource.user.read();
  return <h1>{user.name}</h1>;
}

function ProfileTimeline({ resource }) {
  const posts = resource.posts.read();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.text}</li>
      ))}
    </ul>
  );
}

export default App;
