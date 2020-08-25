/**
 * Forked from: https://codesandbox.io/s/black-wind-byilt
 */

import Brahmos, { SuspenseList, Suspense, useEffect, useState } from 'brahmos';
import ReactCredit from '../common/ReactCredit';

import { fetchProfileData } from './fakeApi';

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

function ProfilePage({ revealOrder = 'forwards', tail }) {
  const [resource, setResource] = useState();
  return (
    <div style={{ minHeight: resource ? 250 : 0 }}>
      <Suspense fallback={<h1>Loading...</h1>}>
        <button
          className="button is-primary"
          onClick={() => {
            setResource(fetchProfileData(0));
          }}
        >
          Load/Reload
        </button>
        {resource && (
          <>
            <ProfileDetails resource={resource} />
            <SuspenseList revealOrder={revealOrder} tail={tail}>
              <Suspense fallback={<h2>Loading posts...</h2>}>
                <ProfileTimeline resource={resource} />
              </Suspense>
              <Suspense fallback={<h2>Loading fun facts...</h2>}>
                <ProfileTrivia resource={resource} />
              </Suspense>
            </SuspenseList>
          </>
        )}
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <>
      <p>
        This demo demonstrates Suspense List Implementation on Brahmos.
        <br />
        The APIs are mocked to respond in between 0-3000ms.
      </p>
      <div>
        <hr />
        <h3>Suspense list with forwards reveal order.</h3>
        <p>
          Though api response time can defer, in forwards reveal order, it guarantees the second
          suspense will not reveal before the first suspense. In this example fun facts will never
          be revealed before the post.
          <br />
          <strong>Click on button multiple times to see the effect.</strong>
        </p>
        <ProfilePage revealOrder="forwards" />
      </div>
      <div>
        <hr />
        <h3>Suspense list with backwards reveal order.</h3>
        <p>
          In backwards reveal order, it guarantees the suspense are revealed from last to first. In
          this example post will never be revealed before the fun fact.
          <br />
          <strong>Click on button multiple times to see the effect.</strong>
        </p>
        <ProfilePage revealOrder="backwards" />
      </div>
      <div>
        <hr />
        <h3>Suspense list with together reveal order.</h3>
        <p>In together reveal order, all the suspense are revealed together.</p>
        <ProfilePage revealOrder="together" />
      </div>
      <div>
        <hr />
        <h3>Suspense list with collapsed loading state.</h3>
        <p>Only one loading will be shown inside the SuspenseList at a time.</p>
        <ProfilePage tail="collapsed" />
      </div>
      <div>
        <hr />
        <h3>Suspense list with no loading state.</h3>
        <p>No loading will be shown inside the SuspenseList when tail prop is set to hidden.</p>
        <ProfilePage tail="hidden" />
      </div>
      <ReactCredit name="Suspense List" link="https://codesandbox.io/s/black-wind-byilt" />
    </>
  );
}

export default App;
