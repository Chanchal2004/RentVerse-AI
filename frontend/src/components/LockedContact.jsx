import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  Lock,
  Unlock,
  Crown,
  Loader2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";


function loadRazorpayScript() {
  return new Promise((resolve) => {

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const s = document.createElement("script");

    s.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    s.onload = () => resolve(true);

    s.onerror = () => resolve(false);

    document.body.appendChild(s);
  });
}


/*
 * After Razorpay payment, check our backend directly.
 *
 * This is useful when the Razorpay checkout callback
 * does not reach our frontend correctly.
 */
async function checkPaymentStatus(orderId) {

  const maxAttempts = 30;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {

    try {

      const { data } = await api.get(
        `/payments/status/${orderId}`
      );

      console.log(
        "Razorpay payment status:",
        data
      );

      if (
        data.paid === true &&
        data.unlocked === true
      ) {
        return true;
      }

      /*
       * Payment may still be processing.
       * Wait 2 seconds and check again.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );

    } catch (error) {

      console.error(
        "Payment status check failed:",
        error
      );

      /*
       * Do not immediately show an error.
       * Razorpay/backend may still be processing.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }
  }

  return false;
}


export default function LockedContact({
  property,
  onUnlocked,
}) {

  const { user } = useAuth();

  const [loading, setLoading] =
    useState(false);

  const nav = useNavigate();


  /*
   * Contact is already unlocked.
   */
  if (property.contact_unlocked) {

    return (
      <div className="rounded-xl border border-warm bg-olive-bg p-6">

        <div className="flex items-center gap-2 mb-3">

          <Unlock
            size={16}
            className="text-olive"
          />

          <span className="label-overline text-olive">
            Owner Contact
          </span>

        </div>


        <div
          className="text-forest font-semibold text-lg"
          data-testid="unlocked-contact-name"
        >
          {property.owner_name}
        </div>


        {property.contact_phone && (

          <a
            href={`tel:${property.contact_phone}`}
            data-testid="unlocked-contact-phone"
            className="text-forest text-lg block mt-1"
          >
            📞 {property.contact_phone}
          </a>

        )}


        {property.contact_email && (

          <div
            className="text-forest-2 text-sm mt-1"
            data-testid="unlocked-contact-email"
          >
            ✉︎ {property.contact_email}
          </div>

        )}

      </div>
    );
  }


  /*
   * Start Razorpay payment.
   */
  const handleUnlock = async () => {

    if (!user) {
      nav("/login");
      return;
    }


    if (user.role !== "tenant") {

      toast.error(
        "Only tenants can unlock contacts"
      );

      return;
    }


    setLoading(true);


    try {

      /*
       * --------------------------------------------------
       * STEP 1
       * Create Razorpay order from backend.
       * --------------------------------------------------
       */

      const { data: order } =
        await api.post(
          "/payments/order",
          {
            purpose: "unlock",
            property_id: property.id,
          }
        );


      /*
       * --------------------------------------------------
       * STEP 2
       * Load Razorpay Checkout SDK.
       * --------------------------------------------------
       */

      const ok =
        await loadRazorpayScript();


      if (!ok) {

        toast.error(
          "Failed to load payment SDK"
        );

        setLoading(false);

        return;
      }


      /*
       * --------------------------------------------------
       * STEP 3
       * Open Razorpay Checkout.
       * --------------------------------------------------
       */

      const rz =
        new window.Razorpay({

          key: order.key_id,

          amount: order.amount,

          currency: order.currency,

          order_id: order.order_id,

          name: "Rentily",

          description:
            `Unlock contact for ${property.title}`,

          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone || "",
          },

          theme: {
            color: "#D26955",
          },


          /*
           * ------------------------------------------------
           * Razorpay successfully returned payment details.
           * ------------------------------------------------
           */
          handler: async (resp) => {

            console.log(
              "Razorpay handler response:",
              resp
            );


            try {

              /*
               * First try normal signature verification.
               */
              await api.post(
                "/payments/verify",
                {
                  razorpay_order_id:
                    resp.razorpay_order_id,

                  razorpay_payment_id:
                    resp.razorpay_payment_id,

                  razorpay_signature:
                    resp.razorpay_signature,

                  purpose: "unlock",

                  property_id:
                    property.id,
                }
              );


              /*
               * Verification succeeded.
               */
              toast.success(
                "Contact unlocked!"
              );


              /*
               * Refresh property details.
               */
              if (onUnlocked) {
                await onUnlocked();
              }


              setLoading(false);

            } catch (verifyError) {

              console.error(
                "Normal payment verification failed:",
                verifyError
              );


              /*
               * ------------------------------------------------
               * FALLBACK
               *
               * Ask backend to check Razorpay directly.
               * ------------------------------------------------
               */

              toast.info(
                "Payment received. Confirming payment..."
              );


              const unlocked =
                await checkPaymentStatus(
                  order.order_id
                );


              if (unlocked) {

                toast.success(
                  "Contact unlocked!"
                );


                /*
                 * Refresh property details so that
                 * phone/email become visible.
                 */
                if (onUnlocked) {
                  await onUnlocked();
                }

              } else {

                toast.error(
                  "Payment is still being confirmed. Please check again shortly."
                );

              }


              setLoading(false);
            }
          },


          /*
           * ------------------------------------------------
           * User closes Razorpay without completing payment.
           * ------------------------------------------------
           */
          modal: {

            ondismiss: async () => {

              console.log(
                "Razorpay checkout dismissed."
              );


              /*
               * Even if checkout was closed,
               * check whether payment actually got captured.
               *
               * This handles cases where money was deducted
               * but checkout remained open/stuck.
               */

              try {

                toast.info(
                  "Checking payment status..."
                );


                const unlocked =
                  await checkPaymentStatus(
                    order.order_id
                  );


                if (unlocked) {

                  toast.success(
                    "Contact unlocked!"
                  );


                  if (onUnlocked) {
                    await onUnlocked();
                  }

                }

              } catch (error) {

                console.error(
                  "Dismiss payment status check failed:",
                  error
                );

              }


              setLoading(false);
            },
          },

        });


      /*
       * --------------------------------------------------
       * STEP 4
       * Open Razorpay.
       * --------------------------------------------------
       */

      rz.open();

    } catch (e) {

      console.error(
        "Failed to start Razorpay payment:",
        e
      );


      if (
        e.response?.status === 503
      ) {

        toast.error(
          "Payments not yet configured. Contact admin."
        );

      } else {

        toast.error(
          e.response?.data?.detail ||
          "Failed to start payment"
        );
      }


      setLoading(false);
    }
  };


  /*
   * ------------------------------------------------------
   * LOCKED CONTACT UI
   * ------------------------------------------------------
   */

  return (

    <div className="relative overflow-hidden rounded-xl border border-warm bg-bone p-6 min-h-[180px]">

      <div className="pointer-events-none select-none opacity-70">

        <div className="label-overline mb-2">
          Owner Contact
        </div>

        <div className="h-6 bg-forest/10 rounded w-2/3 mb-2" />

        <div className="h-5 bg-forest/10 rounded w-1/2" />

      </div>


      <div className="locked-blur">

        <Lock
          className="text-forest mb-2"
          size={28}
        />


        <div className="text-forest font-bold text-lg mb-1">
          Contact locked
        </div>


        <div className="text-forest-2 text-sm mb-3">
          Unlock owner phone & email
        </div>


        <button
          data-testid="unlock-contact-button"
          onClick={handleUnlock}
          disabled={loading}
          className="btn-dark"
        >

          {loading ? (

            <Loader2
              size={16}
              className="animate-spin"
            />

          ) : (

            <Unlock
              size={16}
            />

          )}

          {loading
            ? "Confirming payment..."
            : "Unlock for ₹1"
          }

        </button>


        <button
          data-testid="upgrade-premium-link"
          onClick={() =>
            nav("/pricing")
          }
          className="mt-3 text-sm text-terra font-semibold inline-flex items-center gap-1"
        >

          <Crown
            size={14}
          />

          Or go Premium — unlimited unlocks

        </button>

      </div>

    </div>
  );
}
