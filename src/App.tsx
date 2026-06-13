import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="container">
        <div className="content">
          <h1 className="h1">TimeCross</h1>
          <h2 className="h2">Understand Time Across the World</h2>

          <div className="links">
            {/*
              <a href="#" className="appStore"></a>
              <a href="#" className="gPlay disabled">
                <span className="gPlay-soon">Coming Soon</span>
              </a>
            */}
          </div>

          <div>{count}</div>
          <div><button type="button" onClick={() => setCount(count + 1)} /></div>

          <div className="support">Contact: <a href="mailto:support@timecross.app">support@timecross.app</a></div>
        </div>
      </div>
    </>
  )
}

export default App
