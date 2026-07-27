import type { Request, Response } from 'express';

export async function props(req: Request, res: Response) {
  const products: Record<string, any> = {
    '1': { id: 1, name: 'MacBook Pro M3', price: 1999, category: 'Hardware', description: 'Puissance et autonomie exceptionnelles pour développeurs exigeants.' },
    '2': { id: 2, name: 'Clavier Mécanique RGB', price: 129, category: 'Accessoires', description: 'Switches tactiles de précision avec rétroéclairage personnalisable.' },
    '3': { id: 3, name: 'Écran 4K Ergonomique', price: 499, category: 'Écrans', description: '32 pouces avec hub USB-C et calibration de couleur professionnelle.' },
    '4': { id: 4, name: 'Souris Sans Fil MX', price: 99, category: 'Accessoires', description: 'Défilement ultra-rapide et ergonomie maximale.' },
  };

  const id = req.params.id;
  const product = products[id] || null;

  return {
    title: product ? product.name : 'Produit non trouvé',
    product,
  };
}
