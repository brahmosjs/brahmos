export function fetchProfileData() {
  const userPromise = fetchUser();
  const postsPromise = fetchPosts();
  const triviaPromise = fetchTrivia();
  return {
    user: wrapPromise(userPromise),
    posts: wrapPromise(postsPromise),
    trivia: wrapPromise(triviaPromise),
  };
}

// Suspense integrations like Relay implement
// a contract like this to integrate with React.
// Real implementations can be significantly more complex.
// Don't copy-paste this into your project!
function wrapPromise(promise) {
  const promiseId = performance.now();
  let status = 'pending';
  let result;
  const suspender = promise.then(
    (r) => {
      // console.log('promiseId on success ---', promiseId, r);
      status = 'success';
      result = r;
      return result;
    },
    (e) => {
      status = 'error';
      result = e;
    },
  );
  return {
    read() {
      if (status === 'pending') {
        // console.log('promiseId on suspend ---', promiseId);
        throw suspender;
      } else if (status === 'error') {
        throw result;
      } else if (status === 'success') {
        return result;
      }
    },
  };
}

function fetchUser() {
  // console.log('fetch user...');
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('fetched user');
      resolve({
        name: 'Ringo Starr',
      });
    }, 1000);
  });
}

const ringoPosts = [
  {
    id: 0,
    text: 'I get by with a little help from my friends',
  },
  {
    id: 1,
    text: "I'd like to be under the sea in an octupus's garden",
  },
  {
    id: 2,
    text: 'You got that sand all over your feet',
  },
];

function fetchPosts() {
  const ringoPostsAtTheTime = ringoPosts;
  // console.log('fetch posts...');
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('fetched posts');
      resolve(ringoPostsAtTheTime);
    }, 2000);
  });
}

function fetchTrivia() {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('fetched trivia');

      resolve([
        {
          id: 1,
          text: 'The nickname "Ringo" came from his habit of wearing numerous rings.',
        },
        {
          id: 2,
          text: 'Plays the drums left-handed with a right-handed drum set.',
        },
        {
          id: 3,
          text: 'Nominated for one Daytime Emmy Award, but did not win',
        },
        {
          id: 4,
          text: 'Nominated for one Daytime Emmy Award, and did win this time',
        },
      ]);
    }, 3000);
  });
}
