import { useState, useEffect } from "react";
import axios from 'axios';

import MosqlimateLogo from "../../img/logo-mosqlimate.png";

function Home() {
  const [message, setMessage] = useState(false);

  useEffect(() => {
    axios.get('http://backend:8045/')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.log(error);
      });
  }, []);

  return (
    <div>
      <h1>Hello, World!</h1>
      <p>{message}</p>
    </div>
  );
};

export default Home;
