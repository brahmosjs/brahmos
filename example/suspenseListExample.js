import Brahmos, { SuspenseList, Suspense } from '../src';

import { fetchProfileData } from './fakeApiSuspenseList';

const initialResource = fetchProfileData(0);

export default function App() {
  return <ProfilePage resource={initialResource} />;
}

function ProfilePage({ resource }) {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<h1>Loading...</h1>}>
        <ProfileDetails resource={resource} />
      </Suspense>
      <SuspenseList revealOrder="forwards" tail="collapsed">
        <Suspense fallback={<h2>Loading posts...</h2>}>
          <ProfileTimeline resource={resource} />
        </Suspense>
        <Suspense fallback={<h2>Loading fun facts...</h2>}>
          <ProfileTrivia resource={resource} />
        </Suspense>
      </SuspenseList>
    </SuspenseList>
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
