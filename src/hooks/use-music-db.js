const DB_NAME = import.meta.env.PROD ? 'music' : 'music-dev';
const DB_VERSION = 2;
const DB_STORE_NAME = 'songs';
const EVENTS_STORE_NAME = 'play_events';

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
    const db = evt.target.result;
    const oldVersion = evt.oldVersion;

    // v0 → v2（全新安装）：创建 songs store
    if (oldVersion < 1) {
      db.createObjectStore(DB_STORE_NAME, { keyPath: 'sha' });
    }

    // v1 → v2（升级）：新增 play_events store
    if (oldVersion < 2) {
      const eventStore = db.createObjectStore(EVENTS_STORE_NAME, {
        autoIncrement: true,
      });
      eventStore.createIndex('sha', 'sha', { unique: false });
      eventStore.createIndex('at', 'at', { unique: false });
    }
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

  // 更新歌曲记录的可编辑字段（tags / manualCooledUntil）
  // 注意：不会覆盖 blob / path / sha 等已有字段，只 patch 传入的字段
  function update(sha, patch) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(DB_STORE_NAME);
      const getReq = store.get(sha);
      getReq.onerror = reject;
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) {
          reject(new Error(`歌曲 ${sha} 不存在`));
          return;
        }
        Object.assign(record, patch);
        const putReq = store.put(record);
        putReq.onerror = reject;
        putReq.onsuccess = () => resolve(record);
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

  // ---- play_events ----

  function addEvent(event) {
    return new Promise((resolve, reject) => {
      const store = db
        .transaction(EVENTS_STORE_NAME, 'readwrite')
        .objectStore(EVENTS_STORE_NAME);
      const req = store.add(event);
      req.onerror = reject;
      req.onsuccess = (evt) => {
        resolve(evt.target.result);
      };
    });
  }

  function getAllEvents() {
    return new Promise((resolve, reject) => {
      const store = db
        .transaction(EVENTS_STORE_NAME)
        .objectStore(EVENTS_STORE_NAME);
      const req = store.getAll();
      req.onerror = reject;
      req.onsuccess = (evt) => {
        resolve(req.result || []);
      };
    });
  }

  // 删除某首歌所有未完成的播放事件（“立即解冻”时清除自动冷却依据）
  function deleteUncompletedEvents(sha) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(EVENTS_STORE_NAME);
      const index = store.index('sha');
      const req = index.openCursor(IDBKeyRange.only(sha));
      const removed = [];
      req.onerror = reject;
      req.onsuccess = (evt) => {
        const cursor = evt.target.result;
        if (cursor) {
          if (!cursor.value.completed) removed.push({ key: cursor.primaryKey, at: cursor.value.at });
          cursor.continue();
        } else {
          for (const { key } of removed) store.delete(key);
          resolve(removed);
        }
      };
    });
  }

  return {
    db,
    connect,
    get,
    add,
    update,
    delete: del,
    addEvent,
    getAllEvents,
    deleteUncompletedEvents,
  };
}
