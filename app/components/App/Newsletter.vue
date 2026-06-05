<template>
  <div
    class="flex flex-col items-center gap-8 pt-16 border-t-[0.2em] border-dashed w-full"
    :data-color="'#333333'"
  >
    <div class="flex flex-col items-center text-center lg:gap-8 gap-4">
      <p>sign up to stay informed on events?</p>
      <form
        action="https://buttondown.com/api/emails/embed-subscribe/untitledgamesevent"
        method="post"
        class="embeddable-buttondown-form flex flex-col sm:flex-row items-stretch"
      >
        <input
          type="email"
          name="email"
          id="bd-email"
          placeholder="Your email"
          class="p-4 py-3 border-[0.2em] border-current font-sans bg-white"
        />
        <input
          type="submit"
          value="Subscribe"
          class="p-4 border-[0.2em] border-current font-sans bg-black text-white cursor-pointer transition-colors md:hover:bg-white md:hover:text-black"
        />
      </form>
    </div>

    <div class="w-full flex items-center flex-col gap-2">
      <p>or follow us?</p>

      <div class="flex items-center gap-4">
        <a
          href="https://www.instagram.com/untitledgamesevent/"
          target="_blank"
          class="link"
        >
          <Icon name="pixel:instagram" size="1.5em" />
        </a>
        <a
          href="https://bsky.app/profile/untitledgamesevent.bsky.social"
          target="_blank"
          class="link"
        >
          <Icon name="pixel:bluesky" size="1.5em" />
        </a>
      </div>
    </div>
  </div>
</template>
