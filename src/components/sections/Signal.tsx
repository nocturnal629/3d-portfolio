import { FaGithub, FaLinkedin } from 'react-icons/fa';
import GameLaunchButton from '@/components/features/GameLaunchButton';
import SignalTransmit from '@/components/features/SignalTransmit';
import SectionShell from '@/components/ui/SectionShell';
import { profile } from '@/data/profile';

export default function Signal() {
  return (
    <SectionShell id="signal" title="Transmit a signal" width="prose">
      <p className="text-balance-pretty text-sm leading-relaxed text-slate-300">
        Got something worth building? Send the idea through. It lands in the relay log — no
        account, no newsletter, no reply-all.
      </p>

      <div className="mt-6">
        <SignalTransmit />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
        <span
          className="hud-label"
          title="Relay whisper: the Hangar answers to the code PULSAR"
        >
          Direct channels
        </span>
        <a
          href={profile.socials.github}
          target="_blank"
          rel="noopener noreferrer"
          className="chip hover:border-nova/40 hover:text-nova"
        >
          <FaGithub className="h-3.5 w-3.5" aria-hidden="true" />
          GitHub
        </a>
        <a
          href={profile.socials.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="chip hover:border-nova/40 hover:text-nova"
        >
          <FaLinkedin className="h-3.5 w-3.5" aria-hidden="true" />
          LinkedIn
        </a>
      </div>

      <GameLaunchButton />
    </SectionShell>
  );
}
