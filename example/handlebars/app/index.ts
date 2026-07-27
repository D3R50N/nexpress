import type { Request, Response } from 'express';

export async function props(req: Request, res: Response) {
  let joke = null;
  try {
    const resApi = await fetch('https://v2.jokeapi.dev/joke/Any?lang=fr');
    joke = await resApi.json();
  } catch (err) {
    joke = null;
  }

  return {
    title: 'Accueil',
    joke,
    featuredProducts: [
      {
        id: 1,
        name: 'MacBook Pro M3',
        price: 1999,
        category: 'Hardware',
        description: 'Puissance et autonomie exceptionnelles.',
      },
      {
        id: 2,
        name: 'Clavier Mécanique RGB',
        price: 129,
        category: 'Accessoires',
        description: 'Switches tactiles pour développeurs.',
      },
      {
        id: 3,
        name: 'Écran 4K Ergonomique',
        price: 499,
        category: 'Écrans',
        description: '32 pouces avec hub USB-C.',
      },
    ],
  };
}
