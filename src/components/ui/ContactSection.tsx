/**
 * HavenArt — Semantic Contact Section Component
 * Contract Version: havenart-contracts-1.1
 * Note: Only component permitted to render section#contact.
 * Unconfigured channels render an honest disabled status without fake href.
 */

import React from 'react';
import type { ContactConfig, Dictionary } from '@/types/story';
import { getContactUrl, REQUIRED_CONTACT_CHANNELS } from '@/lib/contact';

export interface ContactSectionProps {
  readonly copy: Dictionary['contact'];
  readonly contacts: ContactConfig;
}

export function ContactSection({ copy, contacts }: ContactSectionProps) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="py-16 px-6 max-w-4xl mx-auto border-t border-stone-200 mt-16"
    >
      <h2 id="contact-heading" className="text-3xl font-serif text-stone-900 mb-4">
        {copy.title}
      </h2>
      <p className="text-stone-600 leading-relaxed mb-8 max-w-2xl">
        {copy.description}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list">
        {REQUIRED_CONTACT_CHANNELS.map((channel) => {
          const url = getContactUrl(contacts, channel);
          const channelName = copy.channels[channel];

          return (
            <div
              key={channel}
              role="listitem"
              className="p-5 rounded-lg border border-stone-200 bg-stone-100/70 flex flex-col justify-between"
            >
              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-500 block mb-1">
                  {channelName}
                </span>
                <span className="text-sm font-medium text-stone-700">
                  {url ? copy.cta : copy.unconfigured}
                </span>
              </div>

              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 transition-colors"
                >
                  {copy.cta} — {channelName}
                </a>
              ) : (
                <span
                  className="inline-flex items-center justify-center px-4 py-2 bg-stone-200/80 text-stone-500 text-sm font-medium rounded cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  {copy.unconfigured}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
