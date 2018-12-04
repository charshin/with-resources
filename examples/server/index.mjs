import Koa from 'koa';
import cors from '@koa/cors';
import fetch from 'node-fetch';

const app = new Koa();
const PORT = process.env.PORT || 9000;
const URLs = {
  fox: 'https://randomfox.ca/floof/',
  cat: 'https://aws.random.cat/meow',
  dog: 'https://random.dog/woof.json',
};

app.use(cors()).use(async (ctx) => {
  try {
    const { kind = 'fox' } = ctx.request.query;
    const { image, file, url } = await fetch(URLs[kind] || URLs.fox).then(res => res.json());
    ctx.body = image || file || url;
  } catch (error) {
    const errorMessage = `Error fetching random fox image: ${error}`;
    console.log(errorMessage);
    ctx.body = errorMessage;
  }
});

app.listen(PORT, () => console.log(`Server is listenning on port ${PORT}...`));
