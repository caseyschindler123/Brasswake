// Served only by the loopback test server, before any game code runs.
(() => {
  const memory = new Map();
  const storage = { get length(){return memory.size;}, key:i=>[...memory.keys()][i]??null,
    getItem:k=>memory.get(String(k))??null, setItem:(k,v)=>memory.set(String(k),String(v)),
    removeItem:k=>memory.delete(String(k)), clear:()=>memory.clear() };
  Object.defineProperty(window,'localStorage',{value:storage});
  Object.defineProperty(window,'sessionStorage',{value:storage});
  storage.setItem('brasswake.sound',JSON.stringify({mu:0,fx:0}));
  window.claude=undefined;
})();
