// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "./LoginSuccessSkeleton.module.css";
import LoginSuccessSkeleton from "./LoginSuccessSkeleton";

describe("LoginSuccessSkeleton", () => {
  it("should render with local CSS module classes instead of legacy global login classes", () => {
    const { container } = render(<LoginSuccessSkeleton />);
    const loginContainerClass = styles.loginContainer;
    const shortClass = styles.short;
    const formFooterClass = styles.formFooter;

    expect(loginContainerClass).toBeTruthy();
    expect(shortClass).toBeTruthy();
    expect(formFooterClass).toBeTruthy();

    if (
      loginContainerClass === undefined ||
      shortClass === undefined ||
      formFooterClass === undefined
    ) {
      throw new Error("Expected the login skeleton CSS module classes to be available.");
    }

    const root = container.firstElementChild;
    expect(root).toBeTruthy();

    if (root === null) {
      throw new Error("Expected the login success skeleton root element to be rendered.");
    }

    expect(root.classList.contains(loginContainerClass)).toBe(true);
    expect(root.classList.contains("login-container")).toBe(false);
    expect(container.querySelector(`.${shortClass}`)).toBeTruthy();
    expect(container.querySelector(".short")).toBeNull();
    expect(container.querySelector(`.${formFooterClass}`)).toBeTruthy();
    expect(container.querySelector(".form-footer")).toBeNull();
  });
});
