const DB_NAME = import.meta.env.PROD ? 'music' : 'music-dev';
const DB_VERSION = 1;
const DB_STORE_NAME = 'songs';

export default function useMusicDB() {
  let db;
  let _resolve, _reject;

  const connect = () =>
    new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
      // 如果 db 已经就绪（open 比 connect() 调用更快），直接 resolve
      if (db) resolve(db);
    });

  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = (evt) => {
    console.error('连接 IndexDB 失败！');
    _reject?.(evt);
  };
  request.onsuccess = (evt) => {
    console.log('连接 IndexDB 成功！');
    db = evt.target.result;
    _resolve?.(db);
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
      req.onerror = reject;
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
      req.onerror = reject;
      req.onsuccess = (evt) => {
        resolve(evt.target.result);
      };
    });
  }

  function del(sha) {
    return new Promise((resolve, reject) => {
      const store = db
        .transaction(DB_STORE_NAME, 'readwrite')
        .objectStore(DB_STORE_NAME);
      const req = store.delete(sha);
      req.onerror = reject;
      req.onsuccess = resolve;
    });
  }

  return {
    db,
    connect,
    get,
    add,
    delete: del,
  };
}
