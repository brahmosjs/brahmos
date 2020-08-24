/**
 * Forked from: https://codesandbox.io/s/jovial-lalande-26yep?file=/src/index.js:0-1646
 */
import Brahmos, { useState, useTransition, Suspense } from 'brahmos';
import ReactCredit from '../common/ReactCredit';

import { fetchProfileData } from './fakeApi';

function getNextId(id) {
  return id === 3 ? 0 : id + 1;
}

const initialResource = fetchProfileData(0);

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

function ProfilePageWithoutTransition() {
  const [resource, setResource] = useState(initialResource);

  return (
    <div>
      <hr />
      <h3>Example of suspense for data fetching.</h3>
      <p>
        As soon as we click the button the view will go on receded state (shows loader), and as soon
        as partial data (skeleton or required data) is available it will starts showing partial
        data, and then show the complete data lazily.
        <br />
        <strong>Click Next to see the behaviour</strong>
      </p>
      <div style={{ minHeight: 210 }}>
        <div className="control-wrap">
          <button
            className="button is-primary"
            onClick={() => {
              const nextUserId = getNextId(resource.userId);
              setResource(fetchProfileData(nextUserId));
            }}
          >
            Next
          </button>
        </div>
        <Suspense fallback={<h1>Loading profile...</h1>}>
          <ProfileDetails resource={resource} />
          <Suspense fallback={<h1>Loading posts...</h1>}>
            <ProfileTimeline resource={resource} />
          </Suspense>
        </Suspense>
      </div>
    </div>
  );
}

function ProfilePageWithTransition() {
  const [resource, setResource] = useState(initialResource);
  const [startTransition, isPending] = useTransition({
    timeoutMs: 3000,
  });

  return (
    <div>
      <hr />
      <h3>Example of transition.</h3>
      <p>
        Preferably, we should remain on the same screen with pending state until we have partial
        data (skeleton or required data).
        <br />
        <strong>Click Next to see the behaviour</strong>
      </p>
      <div style={{ minHeight: 210 }}>
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
        <Suspense fallback={<h1>Loading profile...</h1>}>
          <ProfileDetails resource={resource} />
          <Suspense fallback={<h1>Loading posts...</h1>}>
            <ProfileTimeline resource={resource} />
          </Suspense>
        </Suspense>
      </div>
    </div>
  );
}

function ProfilePageWithTransitionPreferred() {
  const [resource, setResource] = useState(initialResource);
  const [startTransition, isPending] = useTransition({
    timeoutMs: 3000,
  });

  return (
    <div>
      <hr />
      <h3>Another example of transition.</h3>
      <p>
        We can also wait in pending state until complete data is available for next page.
        <br />
        <strong>Click Next to see the behaviour</strong>
      </p>
      <div style={{ minHeight: 210 }}>
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
        <Suspense fallback={<h1>Loading profile...</h1>}>
          <ProfileDetails resource={resource} />
        </Suspense>
        <Suspense fallback={<h1>Loading posts...</h1>}>
          <ProfileTimeline resource={resource} />
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <p>
        This demo demonstrates concurrent mode patterns in Brahmos.
        <br />
        It demonstrates Suspense for data fetch (Render as you fetch), Transitions and preferred
        rendering approach (Pending -> Skeleton -> Complete). Read more about it in official React
        Docs.
        <a
          href="https://reactjs.org/docs/concurrent-mode-patterns.html"
          target="_blank"
          rel="noopener"
        >
          https://reactjs.org/docs/concurrent-mode-patterns.html
        </a>
        <br />
        <br />
        On this demo APIs are mocked. Profile detail API responds between 0 - 1000ms and Post API
        responds between 0 - 2000ms
      </p>
      <ProfilePageWithoutTransition />
      <ProfilePageWithTransition />
      <ProfilePageWithTransitionPreferred />
      <ReactCredit name="Concurrent Mode" link="https://codesandbox.io/s/jovial-lalande-26yep" />
    </>
  );
}
