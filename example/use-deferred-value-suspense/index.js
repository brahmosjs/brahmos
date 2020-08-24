/**
 * Forked from: https://codesandbox.io/s/vigorous-keller-3ed2b
 */

import Brahmos, { useDeferredValue, useState, useTransition, Suspense } from 'brahmos';
import ReactCredit from '../common/ReactCredit';

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
      <p>
        This demo demonstrates how we can use useDeferredValue to prevent loading state on non
        important data.
        <br />
        Read more about it in official React Docs.
        <a
          href="https://reactjs.org/docs/concurrent-mode-patterns.html#deferring-a-value"
          target="_blank"
          rel="noopener"
        >
          https://reactjs.org/docs/concurrent-mode-patterns.html#deferring-a-value
        </a>
      </p>
      <div className="control-wrap">
        <button
          className="button is-primary"
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
      </div>
      <ProfilePage resource={resource} />
      <ReactCredit name="useDeferredValue" link="https://codesandbox.io/s/vigorous-keller-3ed2b" />
    </>
  );
}

function ProfilePage({ resource }) {
  const deferredResource = useDeferredValue(resource, {
    timeoutMs: 1000,
  });
  return (
    <Suspense fallback={<h1>Loading profile...</h1>}>
      <ProfileDetails resource={resource} />
      <Suspense fallback={<h1>Loading posts...</h1>}>
        <ProfileTimeline resource={deferredResource} isStale={deferredResource !== resource} />
      </Suspense>
    </Suspense>
  );
}

function ProfileDetails({ resource }) {
  const user = resource.user.read();
  return <h1>{user.name}</h1>;
}

function ProfileTimeline({ isStale, resource }) {
  const posts = resource.posts.read();
  return (
    <ul style={{ opacity: isStale ? 0.7 : 1 }}>
      {posts.map((post) => (
        <li key={post.id}>{post.text}</li>
      ))}
    </ul>
  );
}

export default App;
