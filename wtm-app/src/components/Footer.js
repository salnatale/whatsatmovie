import React from 'react';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                © 2023 What's That Movie?.  All rights reserved.
                <div className='donate-button'>
                    <form action="https://www.paypal.com/donate" method="post" target="_top">
                        <input type="hidden" name="business" value="B5KZCR5DRGUVE" />
                        <input type="hidden" name="no_recurring" value="0" />
                        <input type="hidden" name="item_name" value="All donations go towards helping supplement the costs I face running this webpage. Thanks for your support!" />
                        <input type="hidden" name="currency_code" value="USD" />
                        <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
                        <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
                    </form>
                </div>
            </div >
        </footer>
    );
}

export default Footer;
