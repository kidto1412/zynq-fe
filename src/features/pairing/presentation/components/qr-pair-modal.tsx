import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pinInputSchema, PinInputValues } from '../forms/pin-input.schema';
import { usePairingStore } from '../stores/usePairingStore';
import { Dialog, Input } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { QrCode, KeyRound, ShieldAlert, Check } from 'lucide-react';

export const QrPairModal: React.FC = () => {
  const { isQrModalOpen, setQrModalOpen, activePin, joinRealRoom, errorMessage } = usePairingStore();
  const [success, setSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PinInputValues>({
    resolver: zodResolver(pinInputSchema),
    defaultValues: { pin: '' },
  });

  const onSubmit = async (data: PinInputValues) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await joinRealRoom(data.pin);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        reset();
        setQrModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal terhubung dengan PIN tersebut');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isQrModalOpen} onOpenChange={setQrModalOpen}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <QrCode className="w-6 h-6" />
        </div>

        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Instant Device Pairing</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Scan via smartphone camera or enter the 6-digit sync PIN
          </p>
        </div>

        {/* High-fidelity CSS Simulated QR Code */}
        <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
          <div className="w-48 h-48 bg-slate-950 p-2 rounded-xl flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between">
              <div className="w-10 h-10 border-4 border-primary rounded-md p-1">
                <div className="w-full h-full bg-primary rounded-sm" />
              </div>
              <div className="w-10 h-10 border-4 border-primary rounded-md p-1">
                <div className="w-full h-full bg-primary rounded-sm" />
              </div>
            </div>
            
            <div className="my-auto mx-auto grid grid-cols-6 gap-1 w-28 h-28 p-1">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-xs ${
                    (i * 7 + 3) % 2 === 0 ? 'bg-primary' : (i * 3) % 5 === 0 ? 'bg-secondary' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <div className="w-10 h-10 border-4 border-primary rounded-md p-1">
                <div className="w-full h-full bg-primary rounded-sm" />
              </div>
              <div className="flex items-center justify-center w-10 h-10">
                <span className="w-4 h-4 rounded-full bg-primary animate-ping" />
              </div>
            </div>
          </div>
        </div>

        {/* Pairing PIN Callout from Backend */}
        <div className="w-full bg-surface-container-lowest p-3 rounded-xl border border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-secondary" />
            <span className="text-xs text-on-surface-variant font-mono">LIVE SERVER PIN</span>
          </div>
          <span className="font-mono text-lg font-bold text-primary tracking-widest">{activePin}</span>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-3 pt-2">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-mono text-on-surface-variant">Manual PIN Pair</label>
            <div className="flex gap-2">
              <Input
                {...register('pin')}
                placeholder="6 digit PIN"
                maxLength={6}
                className="text-center tracking-widest uppercase font-bold text-lg"
              />
              <Button type="submit" variant="primary" disabled={isSubmitting || success}>
                {success ? (
                  <Check className="w-5 h-5 text-on-primary animate-bounce" />
                ) : isSubmitting ? (
                  '...'
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
            {(errors.pin || formError || errorMessage) && (
              <span className="text-xs text-error flex items-center gap-1 mt-1 font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                {errors.pin?.message || formError || errorMessage}
              </span>
            )}
          </div>
        </form>
      </div>
    </Dialog>
  );
};
