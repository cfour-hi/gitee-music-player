const DB_NAME = 'music';
const DB_VERSION = 1;
const DB_STORE_NAME = 'songs';
let db;

export default function useMusicDB() {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = onerror;
  request.onsuccess = onsuccess;
  request.onupgradeneeded = onupgradeneeded;

  function get(sha) {
    return new Promise((resolve, reject) => {
      const store = db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME);
      const req = store.get(sha);
      req.onerror = (evt) => {
        reject(evt);
      };
      req.onsuccess = (evt) => {
        resolve(req.result);
      };
    });
  }

  function add(data) {
    return new Promise((resolve, reject) => {
      const store = db
        .transaction(DB_STORE_NAME, 'readwrite')
        .objectStore(DB_STORE_NAME);
      const req = store.add(data);
      req.onerror = (evt) => {
        reject(evt);
      };
      req.onsuccess = (evt) => {
        resolve(evt.target.result);
      };
    });
  }

  return {
    db,
    get,
    add,
  };
}

function onerror() {
  console.error('连接 IndexDB 失败！');
}

function onsuccess() {
  console.log('连接 IndexDB 成功！');
  db = this.result;
}

function onupgradeneeded(evt) {
  evt.target.result.createObjectStore(DB_STORE_NAME, {
    keyPath: 'sha',
  });
}
