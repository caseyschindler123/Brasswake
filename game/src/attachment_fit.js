/* Face-sized attachment calibration; source atlas coordinates stay immutable. */
const AttachmentFit=(()=>{
  const beards=[{width:.90,top:.60},{width:.94,top:.60},{width:.60,top:.79},{width:.68,top:.78},{width:.88,top:.63},{width:.87,top:.68,alpha:.48}];
  function placement(item,view,anchor,rect,center,scale,portrait=false){
    const [top,x,width]=anchor;let f=scale,dx=x-center*f,dy=top;
    const beard=item>=12&&item<18?beards[item-12]:null;
    if(beard&&(view===0||view===5)){f=width*beard.width/rect[2];dx=x-rect[2]*f/2;dy=top+width*beard.top;}
    else if(item===23){f=width*(view===2?1.08:1.03)/rect[2];dx=x-rect[2]*f/2;dy=top+width*.16;}
    else if(item===11&&(view===0||view===5)){f=width*1.22/rect[2];dx=x-rect[2]*f/2;dy=top-width*.12;}
    else return null;
    return {dx,dy,w:rect[2]*f,h:rect[3]*f,alpha:beard?.alpha||1,beard:!!beard,long:item===13,portrait};
  }
  function removesTail(item,view){return item===3&&(view===0||view===5);}
  return {placement,removesTail};
})();
if(typeof module!=='undefined')module.exports=AttachmentFit;
