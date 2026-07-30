import type { Request, Response } from 'express';

const products = [
  { id: 1, name: 'MacBook Pro M3', price: 1999, category: 'Hardware' },
  { id: 2, name: 'Clavier Mécanique RGB', price: 129, category: 'Accessoires' },
  { id: 3, name: 'Écran 4K Ergonomique', price: 499, category: 'Écrans' },
  { id: 4, name: 'Souris Sans Fil MX', price: 99, category: 'Accessoires' },
];

export function get(req: Request, res: Response) {
  res.json({
    total: products.length,
    data: products,
  });
}

export function post(req: Request, res: Response) {
  const newProduct = req.body;
  res.status(201).json({
    message: 'Produit créé avec succès',
    product: newProduct,
  });
}
