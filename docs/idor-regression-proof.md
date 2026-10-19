# IDOR Security Regression Proof

## Objective

Verify that the Playwright security regression test detects a
broken object-level authorization (IDOR) vulnerability.

## Experiment

1. Run the IDOR test suite against the fixed implementation.
2. Temporarily remove the order ownership authorization check.
3. Run the same test suite and observe the regression.
4. Restore the authorization check and rerun the tests.
5. Run the complete Playwright suite.

## Results

| Stage | Result |
|---|---|
| Baseline | 6 passed |
| Authorization check removed | 5 passed, 1 failed |
| Regression detected | Expected HTTP 403, received HTTP 200 |
| Fix restored | 6 passed |
| Full regression suite | 35 passed, 0 failed |

## Conclusion

The test `Bob cannot access Alice's order` detected the simulated
authorization regression because the endpoint returned HTTP 200
instead of HTTP 403.

After restoring the authorization check, all six IDOR tests passed.
The complete Playwright suite also passed with 35 tests and zero
failures in 13.9 seconds.

> Note: these figures are from the original experiment, when the suite had
> 35 tests. The suite has since grown to 53 tests (all passing in the latest
> run); the IDOR tests themselves are unchanged (6 tests).

The vulnerable implementation was used only for a controlled local
experiment and was not retained as the final implementation.

## Scope

This experiment validates the effectiveness of the automated IDOR
regression test for the specific ownership-check failure simulated.
It does not establish that the application is free from all IDOR
vulnerabilities.
