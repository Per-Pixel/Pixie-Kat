import React, { useState } from 'react';
import { TiLocationArrow } from "react-icons/ti";
import Button from "./Button";

const TopupForm = () => {
  const [gameId, setGameId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Process topup logic here
    console.log({ gameId, amount, paymentMethod });
  };
  
  return (
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold">Topup Your Game</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-2 block font-robert-medium">Game ID / Username</label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2"
            placeholder="Enter your game ID"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="mb-2 block font-robert-medium">Topup Amount</label>
          <select
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2"
            required
          >
            <option value="">Select amount</option>
            <option value="10">$10 (1000 credits)</option>
            <option value="25">$25 (2750 credits)</option>
            <option value="50">$50 (6000 credits)</option>
            <option value="100">$100 (13000 credits)</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label className="mb-2 block font-robert-medium">Payment Method</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="payment"
                value="credit"
                checked={paymentMethod === 'credit'}
                onChange={() => setPaymentMethod('credit')}
                className="mr-2"
              />
              Credit Card
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="payment"
                value="paypal"
                checked={paymentMethod === 'paypal'}
                onChange={() => setPaymentMethod('paypal')}
                className="mr-2"
              />
              PayPal
            </label>
          </div>
        </div>
        
        <Button
          type="submit"
          title="Process Payment"
          rightIcon={<TiLocationArrow />}
          containerClass="bg-gaming-primary text-white w-full flex-center gap-1"
        />
      </form>
    </div>
  );
};

export default TopupForm;