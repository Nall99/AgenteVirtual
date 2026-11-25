import { TestBed } from '@angular/core/testing';
import { AlertService } from './core/alert.service';
import { ChatApiService } from './core/chat-api.service';
import { App } from './app';

describe('App', () => {
  let health: () => Promise<boolean>;

  beforeEach(async () => {
    health = () => Promise.resolve(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ChatApiService, useValue: { health: () => health() } },
        { provide: AlertService, useValue: { noticeSeen: () => true } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Electra');
  });

  it('should show a loading popup when the server takes time to start', async () => {
    health = () => new Promise<boolean>(() => {});
    const fixture = TestBed.createComponent(App);

    await new Promise((resolve) => setTimeout(resolve, 2600));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Iniciando o servidor');
  });
});
