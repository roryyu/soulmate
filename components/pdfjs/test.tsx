import React, { useEffect,memo } from "react"
interface TestProps {
    flg1:boolean,
    flg2:boolean,
}
const ChildComponent = memo(({flg1,flg2}:TestProps) => {
    console.log('test',flg1,flg2)
  return <div>{new Date().getTime()}</div>;
});

export default ChildComponent