"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { createPayment, devCompletePayment, orderStatus } from "@/app/actions";
import { Countdown } from "@/components/countdown";
import { Qr } from "@/components/qr";
import { buttonClass, ErrorNote, ghostButtonClass } from "@/components/ui";
import { baht } from "@/lib/format";
import type { Payment } from "@/lib/types";

const POLL_MS = 3000;

export function PayPanel({
  orderId,
  totalSatang,
  expiresAt,
  initialPayment,
  showDevTools,
}: {
  orderId: string;
  totalSatang: number;
  expiresAt: string | null;
  initialPayment: Payment | null;
  showDevTools: boolean;
}) {
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(initialPayment?.status === "pending" ? initialPayment : null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, startTransition] = useTransition();

  const goToSuccess = useCallback(() => router.replace(`/orders/${orderId}/success`), [router, orderId]);

  // While a QR is on screen, ask the API every few seconds whether the bank has confirmed.
  useEffect(() => {
    if (!payment) return;
    let stop = false;
    const id = setInterval(async () => {
      const status = await orderStatus(orderId);
      if (stop) return;
      if (status === "paid") goToSuccess();
      if (status === "expired" || status === "cancelled") setExpired(true);
    }, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [payment, orderId, goToSuccess]);

  const start = () =>
    startTransition(async () => {
      setError(null);
      const res = await createPayment(orderId, "promptpay");
      if (res.error) setError(res.error);
      else setPayment(res.payment ?? null);
    });

  const simulate = () =>
    startTransition(async () => {
      const res = await devCompletePayment(orderId);
      if (res.error) setError(res.error);
      else goToSuccess();
    });

  if (expired) {
    return (
      <div className="flex flex-col gap-3 rounded-card bg-white p-6">
        <h2 className="text-xl font-bold">หมดเวลาชำระเงิน</h2>
        <p className="text-muted">ที่ที่จองไว้ถูกคืนแล้ว ถ้าคุณจ่ายไปแล้วระบบจะยืนยันหรือคืนเงินให้อัตโนมัติ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="วิธีชำระเงิน" className="grid grid-cols-3 gap-1 rounded-full bg-white p-1">
        <button type="button" role="radio" aria-checked="true" className="min-h-11 rounded-full bg-brand font-semibold text-white">
          PromptPay
        </button>
        <button type="button" role="radio" aria-checked="false" disabled className="min-h-11 rounded-full text-muted" title="เร็ว ๆ นี้">
          บัตร
        </button>
        <button type="button" role="radio" aria-checked="false" disabled className="min-h-11 rounded-full text-sm text-muted" title="เร็ว ๆ นี้">
          Mobile Banking
        </button>
      </div>

      {!payment ? (
        <button type="button" onClick={start} disabled={pending} className={`${buttonClass} min-h-14`}>
          {pending ? "กำลังสร้าง QR…" : `สร้าง QR ชำระ ${baht(totalSatang)}`}
        </button>
      ) : (
        <section className="flex flex-col items-center overflow-hidden rounded-card bg-white">
          <div className="w-full bg-[#113566] py-2.5 text-center text-[13px] font-semibold tracking-[0.08em] text-white">THAI QR PAYMENT</div>
          <div className="p-5">
            {payment.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- QR image served by the payment gateway
              <img src={payment.qrImageUrl} width={220} height={220} alt={`QR PromptPay ยอด ${baht(payment.amountSatang)}`} />
            ) : payment.qrPayload ? (
              <Qr value={payment.qrPayload} label={`QR PromptPay ยอด ${baht(payment.amountSatang)}`} />
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-2 px-5 pb-5 text-center">
            <b className="text-2xl">{baht(payment.amountSatang)}</b>
            <span className="text-[13px] text-muted">สแกนจากแอปธนาคารไหนก็ได้ ยอดกรอกให้แล้ว</span>
            {expiresAt && (
              <span className="rounded-full bg-warn-soft px-3.5 py-1 text-sm font-semibold text-warn">
                QR หมดอายุใน <Countdown until={payment.expiresAt ?? expiresAt} onExpire={() => setExpired(true)} />
              </span>
            )}
            <span className="flex items-center gap-2 text-[13px] text-muted" aria-live="polite">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" />
              กำลังรอยืนยันจากธนาคาร หน้านี้จะเปลี่ยนเองเมื่อชำระสำเร็จ
            </span>
          </div>
        </section>
      )}

      <ErrorNote message={error} />

      {payment && showDevTools && (
        <button type="button" onClick={simulate} disabled={pending} className={ghostButtonClass}>
          จำลองว่าจ่ายแล้ว (เฉพาะตอนพัฒนา)
        </button>
      )}
    </div>
  );
}
