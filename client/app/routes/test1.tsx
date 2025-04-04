// solve:
// a button and a text in p tag. 2 conditions. if single clicked to btn text should be 'aa' else if double clicked text should be 'bbbbbbbb'.
// also console.log in both conditions.

// but note that when user double clicks single click condition should not be executed.

import { useState } from 'react'

const App = () => {
  const [text, setText] = useState('')
  const [Click, setClick] = useState("aa")
  const [DoubleClick, setDoubleClick] = useState("bbbbbbbb")

  let clickTimeout = null;

  const handleSingleClick = () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }
    clickTimeout = setTimeout(() => {
      setText(Click)
      console.log(Click)
    }, 300);
  }

  const handleDoubleClick = () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }
    setText(DoubleClick)
    console.log(DoubleClick)
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', backgroundColor: 'black'}}>
      <button onClick={handleSingleClick} onDoubleClick={handleDoubleClick} style={{backgroundColor: 'white', color: 'black', padding: '10px', borderRadius: '5px'}}>Clickkkkkkkk meeeeeeeee</button>
      <p style={{color: 'white'}}>{text}</p>
    </div>
  )
}

export default App
