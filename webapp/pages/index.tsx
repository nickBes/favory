import React from 'react'
import Navbar from '../components/navbar'

const Home : React.FC<{bgClass:string}> = () => {
  return (
    <>  
      <section className='p'>
        <Navbar></Navbar>
        <div className='main'>
          <h1>Hey, what's going on guys it's me jermey.</h1>
          <p>Did you know that kndred was actually jin?</p>
          <img src="https://wallpaperaccess.com/full/1369012.jpg"></img>
        </div>
      </section>
      <section className='s'>
        <h1>Hey, what's going on guys it's me jermey.</h1>
      </section>
      <section className='p'>
        <h1>Hey, what's going on guys it's me jermey.</h1>
      </section>
    </>
  )
}

export default Home