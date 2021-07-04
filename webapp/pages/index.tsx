import React from 'react'
import Navbar from '../components/navbar/navbar'
import Form from '../components/form/form'

const Home : React.FC = () => {
  return (
    <>  
      {/* sections have temporary class names in order to distinguish between them */}
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
        <Form formAttr={{action: "./results", method: 'post'}}>
          <input type="text" name="text"/>
          <input type="text" name="text"/>
          <input type="submit"/>
        </Form>
      </section>
      <section className='p'>
        <h1>Hey, what's going on guys it's me jermey.</h1>
      </section>
    </>
  )
}

export default Home