import React, { useState } from 'react';
import { Button } from '@mui/material';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';


// This calls your backend to create a checkout and then redirects the browser.
export default function PaymentButton({ amountUSD = 5, children, onError }) {
    const [loading, setLoading] = useState(false);
    const { info, error } = useToast();
    const [userData, setUserData] = useState(() => {
        const stored = localStorage.getItem('userdata');
        return stored ? JSON.parse(stored) : {};
      });



    const click = async () => {
        try {
            setLoading(true);
            info('Opening stripe subscription checkout...');

            // open link in new tab: https://buy.stripe.com/test_7sYcN58SH61v7JG9LK5AQ00

            const stripeCheckoutUrl_Basic = `https://buy.stripe.com/test_bJedR9fh54Xrd40f645AQ02?client_reference_id=${userData.id}`; //`https://buy.stripe.com/test_14k14g6SH4bA7JG9AA`;
            const stripeCheckoutUrl_Standard = `https://buy.stripe.com/test_6oU7sLfh53Tn1li0ba5AQ01?client_reference_id=${userData.id}`;
            const stripeCheckoutUrl_Premium = `https://buy.stripe.com/test_7sYcN58SH61v7JG9LK5AQ00?client_reference_id=${userData.id}`;
            
            
            if (!amountUSD || amountUSD == 10) {
                window.open(stripeCheckoutUrl_Premium, '_blank');
            }
            if (!amountUSD || amountUSD == 5) {
                window.open(stripeCheckoutUrl_Standard, '_blank');
            }
            if (!amountUSD || amountUSD == 2.5) {
                window.open(stripeCheckoutUrl_Basic, '_blank');
            }
            // const { data } = await api.post('/payments/create-checkout', { amountUSD });
            // if (data?.hosted_url) {
            //     window.location.href = data.hosted_url;
            // } else {
            //     error('Could not start checkout');
            //     onError && onError();
            // }
        } catch (e) {
            console.error(e);
            error('Payment init failed');
            onError && onError();
        } finally { setLoading(false); }
    };
    return (
        <Button onClick={click} disabled={loading} variant="contained" color="secondary">
            {children || (loading ? 'Starting…' : 'Add Credits')}
        </Button>
    );
}


// ```jsx
// import React, { useState } from 'react';
// import { Button } from '@mui/material';
// import api from '../api/client';


// // This calls your backend to create a checkout and then redirects the browser.
// export default function PaymentButton({ amountUSD = 5, children }){
// const [loading, setLoading] = useState(false);
// const click = async () => {
// try{
// setLoading(true);
// const { data } = await api.post('/payments/create-checkout', { amountUSD });
// if (data?.hosted_url) {
// window.location.href = data.hosted_url;
// } else {
// alert('Could not start checkout');
// }
// }catch(e){
// console.error(e);
// alert('Payment init failed');
// }finally{ setLoading(false); }
// };
// return (
// <Button onClick={click} disabled={loading} variant="contained" color="secondary">
// {children || (loading? 'Starting…':'Add Credits')}
// </Button>
// );
// }