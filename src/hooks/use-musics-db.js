const DB_NAME = 'music';
const DB_VERSION = 1;
const DB_STORE_NAME = 'songs';

export default function useMusicDB() {
  let db;

  const connect = () =>
    new Promise((resolve, reject) => {
      connect._resolve = resolve;
      connect._reject = reject;
    });
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = (evt) => {
    console.error('连接 IndexDB 失败！');
    connect._reject(evt);
  };
  request.onsuccess = (evt) => {
    console.log('连接 IndexDB 成功！');
    db = evt.target.result;
    connect._resolve(db);
  };
  request.onupgradeneeded = (evt) => {
    evt.target.result.createObjectStore(DB_STORE_NAME, {
      keyPath: 'sha',
    });
  };

  function get(sha) {
    return new Promise((resolve, reject) => {
      const store = db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME);
      const req = sha ? store.get(sha) : store.getAll();
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
    connect,
    get,
    add,
  };
}
