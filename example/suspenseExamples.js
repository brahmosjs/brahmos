import Brahmos, { useState, useTransition, Suspense } from '../src';

import { fetchProfileData } from './fakeApi';

// const initialResource = fetchProfileData(0);

export default function App() {
  const [tab, setTab] = useState('home');

  function showProfile(id) {
    setTab('profile');
  }

  let page;
  if (tab === 'home' || true) {
    page = <HomePage showProfile={showProfile} />;
  } else if (tab === 'profile') {
    page = <ProfilePage />;
  }

  // return page;
  return <Suspense fallback={<h1>Loading the app...</h1>}>{page}</Suspense>;
}

function HomePage({ showProfile }) {
  return (
    <>
      <h1>Home Page</h1>
      <Button onClick={showProfile}>Open Profile</Button>
    </>
  );
}

function ProfilePage() {
  const [resource, setResource] = useState();

  function showProfile(id) {
    setResource(fetchProfileData(id));
  }

  return (
    <>
      <Button onClick={showProfile}>Open Profile</Button>
      <Suspense fallback={<h2>Loading posts...</h2>}>
        {resource && (
          <>
            <ProfileDetails resource={resource} />

            <Suspense fallback={<h2>Loading posts...</h2>}>
              <ProfileTimeline resource={resource} />
              <ProfileTrivia resource={resource} />
              <Suspense fallback={<h2>Loading fun facts...</h2>} />
            </Suspense>
          </>
        )}
      </Suspense>
    </>
  );
}

function ProfileDetails({ resource }) {
  const user = resource.user.read();
  const posts = resource.posts.read();
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

function ProfileTrivia({ resource }) {
  const trivia = resource.trivia.read();
  return (
    <>
      <h2>Fun Facts</h2>
      <ul>
        {trivia.map((fact) => (
          <li key={fact.id}>{fact.text}</li>
        ))}
      </ul>
    </>
  );
}

function Button({ children, onClick }) {
  const [startTransition, isPending] = useTransition({
    timeoutMs: 10000,
  });

  function handleClick() {
    startTransition(() => {
      onClick();
    });
  }

  const spinner = (
    <span
      style={{
        marginLeft: 4,
        fontSize: 'small',
        visibility: isPending ? 'visible' : 'hidden',
      }}
    >
      Loading...
    </span>
  );

  return (
    <>
      <button onClick={handleClick} disabled={isPending}>
        {children}
      </button>
      {isPending ? spinner : null}
    </>
  );
}
